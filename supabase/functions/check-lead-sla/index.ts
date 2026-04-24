import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SLA_HOURS = 4;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    let slaHours = DEFAULT_SLA_HOURS;
    try { const body = await req.json(); if (body?.sla_hours) slaHours = parseInt(body.sla_hours, 10); } catch {}

    const slaThresholdMs = slaHours * 60 * 60 * 1000;
    const now = new Date();
    const thresholdTime = new Date(now.getTime() - slaThresholdMs);

    const { data: overdueLeads, error: leadsError } = await supabase
      .from("salon_inquiries")
      .select("id, name, email, phone, source, preferred_location, created_at, organization_id")
      .eq("status", "new")
      .lt("created_at", thresholdTime.toISOString());

    if (leadsError) throw leadsError;
    if (!overdueLeads?.length) {
      return new Response(JSON.stringify({ success: true, message: "No overdue leads", count: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const leadIds = overdueLeads.map((l: any) => l.id);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { data: recentAlerts } = await supabase.from("notifications").select("metadata").eq("type", "lead_sla_breach").gte("created_at", oneDayAgo.toISOString());
    const recentlyAlertedLeadIds = new Set((recentAlerts || []).map((n: any) => n.metadata?.lead_id).filter(Boolean));
    const newOverdueLeads = overdueLeads.filter((l: any) => !recentlyAlertedLeadIds.has(l.id));

    if (newOverdueLeads.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Already alerted", count: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: managers } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "manager", "super_admin"]);
    if (!managers?.length) {
      return new Response(JSON.stringify({ success: true, message: "No managers to notify", count: newOverdueLeads.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const managerUserIds = [...new Set(managers.map((m: any) => m.user_id))];
    const { data: locations } = await supabase.from("locations").select("id, name");
    const locationMap = new Map((locations || []).map((l: any) => [l.id, l.name]));

    const siteUrl = Deno.env.get("SITE_URL") || `${supabaseUrl.replace(".supabase.co", ".lovable.app")}`;

    // Create in-app notifications
    const notifications = managerUserIds.flatMap((userId: any) =>
      newOverdueLeads.map((lead: any) => {
        const ageHours = Math.round((now.getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60));
        const locationName = lead.preferred_location ? locationMap.get(lead.preferred_location) : null;
        return {
          user_id: userId, type: "lead_sla_breach", title: `⚠️ Lead SLA Breach`,
          message: `${lead.name} has been waiting ${ageHours}h without contact${locationName ? ` (${locationName})` : ""}`,
          link: "/dashboard/admin/operational-analytics",
          metadata: { lead_id: lead.id, lead_name: lead.name, hours_waiting: ageHours, sla_threshold: slaHours },
        };
      })
    );

    const BATCH_SIZE = 100;
    for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
      await supabase.from("notifications").insert(notifications.slice(i, i + BATCH_SIZE));
    }

    // Send email - try to use org branding if available
    const { data: managerProfiles } = await supabase.from("employee_profiles")
      .select("email, organization_id").in("user_id", managerUserIds).not("email", "is", null);

    const managerEmails = (managerProfiles || []).map((p: any) => p.email).filter(Boolean);
    const orgId = managerProfiles?.[0]?.organization_id || newOverdueLeads[0]?.organization_id;

    if (managerEmails.length > 0) {
      const leadRows = newOverdueLeads.map((lead: any) => {
        const ageHours = Math.round((now.getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60));
        const locationName = lead.preferred_location ? locationMap.get(lead.preferred_location) : "—";
        return `<tr><td style="padding:12px;border-bottom:1px solid #e5e5e5;">${lead.name}</td><td style="padding:12px;border-bottom:1px solid #e5e5e5;">${lead.phone || lead.email || "—"}</td><td style="padding:12px;border-bottom:1px solid #e5e5e5;">${locationName}</td><td style="padding:12px;border-bottom:1px solid #e5e5e5;color:#dc2626;font-weight:600;">${ageHours}h</td></tr>`;
      }).join("");

      const emailHtml = `
        <h2 style="color: #dc2626;">⚠️ Lead Response Time Alert</h2>
        <p>${newOverdueLeads.length} lead${newOverdueLeads.length > 1 ? "s have" : " has"} been waiting <strong>over ${slaHours} hours</strong> without being contacted:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <thead><tr style="background:#f5f5f5;"><th style="padding:12px;text-align:left;">Name</th><th style="padding:12px;text-align:left;">Contact</th><th style="padding:12px;text-align:left;">Location</th><th style="padding:12px;text-align:left;">Waiting</th></tr></thead>
          <tbody>${leadRows}</tbody>
        </table>
        <p style="margin-top:24px;"><a href="${siteUrl}/dashboard/admin/operational-analytics" style="display:inline-block;background:#1a1a1a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">View Lead Inbox</a></p>
        <p style="color:#737373;font-size:14px;margin-top:24px;">This alert was triggered because leads exceeded your ${slaHours}-hour response time SLA.</p>
      `;

      if (orgId) {
        await sendOrgEmail(supabase, orgId, {
          to: managerEmails,
          subject: `⚠️ ${newOverdueLeads.length} Lead${newOverdueLeads.length > 1 ? "s" : ""} Waiting ${slaHours}+ Hours`,
          html: emailHtml,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, overdueLeads: newOverdueLeads.length, notificationsSent: notifications.length, managersNotified: managerUserIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-lead-sla:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
