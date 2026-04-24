import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail } from "../_shared/email-sender.ts";
import { requireAuth, requireOrgAdmin, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, ValidationError, z } from "../_shared/validation.ts";

const ClientAutomationsSchema = z.object({
  organizationId: z.string().uuid(),
  organization_id: z.string().uuid().optional(),
  dryRun: z.boolean().optional().default(false),
});

interface AutomationRule {
  id: string;
  organization_id: string;
  rule_name: string;
  rule_type: string;
  trigger_days: number;
  email_template_id: string | null;
  sms_template_id: string | null;
  is_active: boolean;
  conditions: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Auth guard
    let authResult;
    try {
      authResult = await requireAuth(req);
    } catch (authErr) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { user, supabaseAdmin } = authResult;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const body = await validateBody(req, ClientAutomationsSchema, getCorsHeaders(req));
    const { organizationId, dryRun } = body;
    // Verify org access
    try {
      await requireOrgAdmin(supabaseAdmin, user.id, body.organizationId || body.organization_id);
    } catch (orgErr) {
      return authErrorResponse(orgErr, getCorsHeaders(req));
    }


    let rulesQuery = supabase.from("client_automation_rules").select("*").eq("is_active", true);
    if (organizationId) rulesQuery = rulesQuery.eq("organization_id", organizationId);

    const { data: rules, error: rulesError } = await rulesQuery;
    if (rulesError) throw new Error("Failed to fetch automation rules");
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active automation rules", processed: 0 }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const results = { processed: 0, sent: 0, skipped: 0, errors: 0, details: [] as any[] };

    for (const rule of rules as AutomationRule[]) {
      try {
        const ruleResults = await processRule(supabase, rule, dryRun);
        results.processed += ruleResults.processed;
        results.sent += ruleResults.sent;
        results.skipped += ruleResults.skipped;
        results.errors += ruleResults.errors;
        results.details.push({ ruleId: rule.id, ruleName: rule.rule_name, ruleType: rule.rule_type, ...ruleResults });
      } catch (ruleError) {
        console.error(`Error processing rule ${rule.id}:`, ruleError);
        results.errors += 1;
        results.details.push({ ruleId: rule.id, ruleName: rule.rule_name, error: ruleError instanceof Error ? ruleError.message : "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Client automations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

async function processRule(supabase: any, rule: AutomationRule, dryRun: boolean) {
  const results = { processed: 0, sent: 0, skipped: 0, errors: 0 };
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - rule.trigger_days);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  let clientsToContact: any[] = [];
  switch (rule.rule_type) {
    case 'post_visit_thanks': clientsToContact = await findRecentVisitors(supabase, rule.organization_id, targetDateStr); break;
    case 'rebooking_reminder': clientsToContact = await findClientsNeedingRebooking(supabase, rule.organization_id, targetDateStr); break;
    case 'win_back': clientsToContact = await findInactiveClients(supabase, rule.organization_id, targetDateStr); break;
    case 'birthday': clientsToContact = await findBirthdayClients(supabase, rule.organization_id); break;
    default: console.log(`Unknown rule type: ${rule.rule_type}`);
  }

  results.processed = clientsToContact.length;

  for (const client of clientsToContact) {
    try {
      const { data: recentLogs } = await supabase.from("client_automation_log").select("id")
        .eq("rule_id", rule.id).eq("client_id", client.id)
        .gte("sent_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).limit(1);

      if (recentLogs?.length > 0 || !client.email) { results.skipped += 1; continue; }
      if (dryRun) { results.sent += 1; continue; }

      if (rule.email_template_id) {
        const emailResult = await sendAutomationEmail(supabase, rule, client);
        if (emailResult.success) {
          results.sent += 1;
          await supabase.from("client_automation_log").insert({
            organization_id: rule.organization_id, rule_id: rule.id, client_id: client.id,
            phorest_client_id: client.phorest_client_id, channel: 'email', status: 'sent',
            metadata: { email: client.email, template_id: rule.email_template_id }
          });
        } else {
          results.errors += 1;
          await supabase.from("client_automation_log").insert({
            organization_id: rule.organization_id, rule_id: rule.id, client_id: client.id,
            channel: 'email', status: 'failed', error_message: emailResult.error
          });
        }
      } else {
        results.skipped += 1;
      }
    } catch (clientError) {
      console.error(`Error processing client ${client.id}:`, clientError);
      results.errors += 1;
    }
  }
  return results;
}

async function findRecentVisitors(supabase: any, orgId: string, targetDate: string) {
  const { data: appointments } = await supabase.from("phorest_appointments")
    .select("phorest_client_id").eq("appointment_date", targetDate).eq("status", "completed");
  if (!appointments?.length) return [];
  const clientIds = [...new Set(appointments.map((a: any) => a.phorest_client_id).filter(Boolean))];
  const { data: clients } = await supabase.from("phorest_clients")
    .select("id, phorest_client_id, first_name, last_name, email").in("phorest_client_id", clientIds);
  return clients || [];
}

async function findClientsNeedingRebooking(supabase: any, orgId: string, targetDate: string) {
  const { data: lastAppointments } = await supabase.from("phorest_appointments")
    .select("phorest_client_id, appointment_date").eq("appointment_date", targetDate)
    .not("status", "in", '("cancelled","no_show")');
  if (!lastAppointments?.length) return [];
  const clientIds = [...new Set(lastAppointments.map((a: any) => a.phorest_client_id).filter(Boolean))];
  const today = new Date().toISOString().split('T')[0];
  const { data: futureAppointments } = await supabase.from("phorest_appointments")
    .select("phorest_client_id").in("phorest_client_id", clientIds).gte("appointment_date", today)
    .not("status", "in", '("cancelled","no_show")');
  const clientsWithFuture = new Set((futureAppointments || []).map((a: any) => a.phorest_client_id));
  const needRebooking = clientIds.filter((id: any) => !clientsWithFuture.has(id));
  if (needRebooking.length === 0) return [];
  const { data: clients } = await supabase.from("phorest_clients")
    .select("id, phorest_client_id, first_name, last_name, email").in("phorest_client_id", needRebooking);
  return clients || [];
}

async function findInactiveClients(supabase: any, orgId: string, targetDate: string) {
  const { data: recentClients } = await supabase.from("phorest_appointments")
    .select("phorest_client_id").gte("appointment_date", targetDate).not("status", "in", '("cancelled","no_show")');
  const recentIds = new Set((recentClients || []).map((a: any) => a.phorest_client_id).filter(Boolean));
  const { data: allVisits } = await supabase.from("phorest_appointments")
    .select("phorest_client_id").lt("appointment_date", targetDate).not("status", "in", '("cancelled","no_show")');
  const inactiveIds = [...new Set((allVisits || []).map((a: any) => a.phorest_client_id).filter((id: string) => id && !recentIds.has(id)))];
  if (inactiveIds.length === 0) return [];
  const { data: clients } = await supabase.from("phorest_clients")
    .select("id, phorest_client_id, first_name, last_name, email").in("phorest_client_id", inactiveIds.slice(0, 100));
  return clients || [];
}

async function findBirthdayClients(supabase: any, orgId: string) { return []; }

async function sendAutomationEmail(supabase: any, rule: AutomationRule, client: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: template } = await supabase.from("email_templates").select("*").eq("id", rule.email_template_id).single();
    if (!template) return { success: false, error: "Template not found" };

    let subject = template.subject || "A message for you";
    let body = template.body || "";

    const replacements: Record<string, string> = {
      "{{first_name}}": client.first_name || "Valued Client",
      "{{last_name}}": client.last_name || "",
      "{{full_name}}": `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Valued Client",
    };

    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.replace(new RegExp(key, 'g'), value);
      body = body.replace(new RegExp(key, 'g'), value);
    }

    const result = await sendOrgEmail(supabase, rule.organization_id, {
      to: [client.email],
      subject,
      html: body,
      clientId: client.id,
    });

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Send failed" };
  }
}
