// Phase 2: Reputation Engine dispatcher.
//
// Two-pass cron job (runs hourly via pg_cron):
//   1. ENQUEUE: scan recent completed appointments and create dispatch queue
//      rows for any that match an active automation rule and aren't already
//      queued (frequency cap + service exclusion enforced).
//   2. SEND:    pull due queue rows (scheduled_for <= now), generate a
//      client_feedback_responses token, render the SMS template, send via
//      Twilio (best-effort), and stamp the row with sent_at / skipped_reason.
//
// All writes use the service role; RLS does not apply.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSms } from "../_shared/sms-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_FEEDBACK_BASE = Deno.env.get("PUBLIC_FEEDBACK_BASE_URL") ??
  "https://getzura.com/feedback";

interface DispatchSummary {
  enqueued: number;
  sent: number;
  skipped: number;
  errors: number;
}

function isExcluded(
  serviceCategory: string | null,
  serviceName: string | null,
  rule: { excluded_service_categories?: string[] | null; excluded_service_names?: string[] | null; eligible_service_categories?: string[] | null },
): boolean {
  const cats = rule.excluded_service_categories ?? [];
  const names = rule.excluded_service_names ?? [];
  if (serviceCategory && cats.includes(serviceCategory)) return true;
  if (serviceName && names.includes(serviceName)) return true;
  if (rule.eligible_service_categories?.length && serviceCategory && !rule.eligible_service_categories.includes(serviceCategory)) {
    return true;
  }
  return false;
}

async function enqueueEligible(supabase: any, summary: DispatchSummary) {
  // Pull active rules per org
  const { data: rules } = await supabase
    .from("review_request_automation_rules")
    .select("*")
    .eq("is_active", true);
  if (!rules?.length) return;

  // Group by org for efficiency
  const byOrg = new Map<string, any[]>();
  for (const r of rules) {
    const list = byOrg.get(r.organization_id) ?? [];
    list.push(r);
    byOrg.set(r.organization_id, list);
  }

  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const [orgId, orgRules] of byOrg) {
    // Recent completed appointments for this org
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, organization_id, location_id, client_id, client_phone, client_email, service_category, service_name, status, end_time, appointment_date, updated_at")
      .eq("organization_id", orgId)
      .eq("status", "completed")
      .gte("updated_at", sinceIso)
      .limit(500);
    if (!appts?.length) continue;

    for (const appt of appts) {
      for (const rule of orgRules) {
        // Location filter
        if (rule.location_ids?.length && !rule.location_ids.includes(appt.location_id)) continue;
        // Service filter
        if (isExcluded(appt.service_category, appt.service_name, rule)) continue;

        // Frequency cap — skip client if any prior dispatch within window
        if (appt.client_id && rule.frequency_cap_days) {
          const cutoff = new Date(Date.now() - rule.frequency_cap_days * 86400 * 1000).toISOString();
          const { count } = await supabase
            .from("review_request_dispatch_queue")
            .select("id", { head: true, count: "exact" })
            .eq("organization_id", orgId)
            .eq("client_id", appt.client_id)
            .not("sent_at", "is", null)
            .gte("sent_at", cutoff);
          if ((count ?? 0) > 0) continue;
        }

        const scheduledFor = new Date(
          new Date(`${appt.appointment_date}T${appt.end_time ?? "12:00:00"}`).getTime() +
            (rule.send_delay_minutes ?? 240) * 60 * 1000,
        ).toISOString();

        const { error } = await supabase
          .from("review_request_dispatch_queue")
          .insert({
            organization_id: orgId,
            appointment_id: appt.id,
            rule_id: rule.id,
            client_id: appt.client_id,
            client_phone: appt.client_phone,
            client_email: appt.client_email,
            channel: rule.channel === "email" ? "email" : "sms",
            scheduled_for: scheduledFor,
          });
        if (!error) summary.enqueued++;
        // Unique violation = already queued; ignore silently.
      }
    }
  }
}

async function sendDue(supabase: any, summary: DispatchSummary) {
  const nowIso = new Date().toISOString();
  const { data: due } = await supabase
    .from("review_request_dispatch_queue")
    .select("*")
    .lte("scheduled_for", nowIso)
    .is("sent_at", null)
    .is("skipped_at", null)
    .lt("attempts", 3)
    .limit(200);
  if (!due?.length) return;

  for (const row of due) {
    try {
      // Skip if no contact channel
      const phone = row.client_phone;
      if (row.channel !== "sms" || !phone) {
        await supabase.from("review_request_dispatch_queue").update({
          skipped_at: nowIso,
          skipped_reason: row.channel === "sms" ? "no_phone" : `channel_${row.channel}_unsupported`,
        }).eq("id", row.id);
        summary.skipped++;
        continue;
      }

      // Lookup org name + appointment client name for template
      const [{ data: org }, { data: appt }] = await Promise.all([
        supabase.from("organizations").select("name").eq("id", row.organization_id).single(),
        supabase.from("appointments").select("client_name, client_id").eq("id", row.appointment_id).single(),
      ]);

      // Create a feedback response shell with a token (the dispatcher is the
      // sole source of token-bearing rows for this channel). We need a survey
      // to attach to; use the org's first active survey, or skip.
      const { data: survey } = await supabase
        .from("client_feedback_surveys")
        .select("id")
        .eq("organization_id", row.organization_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!survey) {
        await supabase.from("review_request_dispatch_queue").update({
          skipped_at: nowIso, skipped_reason: "no_active_survey",
        }).eq("id", row.id);
        summary.skipped++;
        continue;
      }

      const token = crypto.randomUUID().replace(/-/g, "");
      const { data: response, error: respErr } = await supabase
        .from("client_feedback_responses")
        .insert({
          organization_id: row.organization_id,
          survey_id: survey.id,
          appointment_id: row.appointment_id,
          client_id: row.client_id,
          token,
          expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        })
        .select("id")
        .single();
      if (respErr) throw respErr;

      const firstName = (appt?.client_name ?? "there").split(" ")[0];
      const feedbackUrl = `${PUBLIC_FEEDBACK_BASE}?token=${token}`;

      const result = await sendSms(supabase, {
        to: phone,
        templateKey: "review_request_default",
        variables: {
          client_first_name: firstName,
          business_name: org?.name ?? "our salon",
          feedback_url: feedbackUrl,
        },
      }, row.organization_id);

      if (result.success) {
        await supabase.from("review_request_dispatch_queue").update({
          sent_at: nowIso,
          survey_response_id: response.id,
          attempts: row.attempts + 1,
        }).eq("id", row.id);
        await supabase.from("review_compliance_log").insert({
          organization_id: row.organization_id,
          event_type: "review_request_sent",
          feedback_response_id: response.id,
          payload: { channel: "sms", template: "review_request_default" },
        });
        summary.sent++;
      } else {
        await supabase.from("review_request_dispatch_queue").update({
          attempts: row.attempts + 1,
          last_error: result.error ?? "unknown",
        }).eq("id", row.id);
        summary.errors++;
      }
    } catch (e: any) {
      await supabase.from("review_request_dispatch_queue").update({
        attempts: (row.attempts ?? 0) + 1,
        last_error: e?.message ?? String(e),
      }).eq("id", row.id);
      summary.errors++;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const summary: DispatchSummary = { enqueued: 0, sent: 0, skipped: 0, errors: 0 };

  try {
    await enqueueEligible(supabase, summary);
    await sendDue(supabase, summary);
    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[dispatch-review-requests] fatal:", e?.message ?? e);
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "unknown", ...summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
