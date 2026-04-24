import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email-sender.ts";
import { PLATFORM_URL } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Auth — verify caller is a platform user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Must be a platform user
    const { data: platformRole } = await supabase
      .from("platform_roles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!platformRole) {
      return new Response(
        JSON.stringify({ error: "Only platform users can send coaching emails" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const { org_id } = await req.json();
    if (!org_id) {
      return new Response(JSON.stringify({ error: "Missing org_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch org details
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, billing_email, last_backroom_coached_at")
      .eq("id", org_id)
      .single();

    if (orgErr || !org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!org.billing_email) {
      return new Response(
        JSON.stringify({ error: "Organization has no billing email configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cooldown check (48 hours)
    if (org.last_backroom_coached_at) {
      const diff = Date.now() - new Date(org.last_backroom_coached_at).getTime();
      if (diff < 48 * 60 * 60 * 1000) {
        return new Response(
          JSON.stringify({ error: "Coaching email already sent recently. Please wait 48 hours." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch template
    const { data: template } = await supabase
      .from("email_templates")
      .select("subject, html_body")
      .eq("template_key", "backroom_coaching")
      .eq("is_active", true)
      .single();

    if (!template) {
      return new Response(
        JSON.stringify({ error: "Coaching email template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute metrics from staff_backroom_performance
    const { data: perfRows } = await supabase
      .from("staff_backroom_performance")
      .select("reweigh_compliance_rate, waste_rate, mix_session_count")
      .eq("organization_id", org_id);

    let avgReweighPct = 0;
    let avgWastePct = 0;
    let totalSessions = 0;

    if (perfRows && perfRows.length > 0) {
      let reweighSum = 0, reweighCount = 0;
      let wasteSum = 0, wasteCount = 0;
      for (const p of perfRows) {
        if (p.reweigh_compliance_rate != null) {
          reweighSum += Number(p.reweigh_compliance_rate);
          reweighCount++;
        }
        if (p.waste_rate != null) {
          wasteSum += Number(p.waste_rate);
          wasteCount++;
        }
        totalSessions += p.mix_session_count || 0;
      }
      avgReweighPct = reweighCount > 0 ? (reweighSum / reweighCount) * 100 : 0;
      avgWastePct = wasteCount > 0 ? (wasteSum / wasteCount) * 100 : 0;
    }

    // Determine reason
    let reason = "General coaching check-in";
    if (avgReweighPct < 50) {
      reason = `Low reweigh compliance (${avgReweighPct.toFixed(0)}%)`;
    } else if (avgWastePct > 10) {
      reason = `Elevated waste rate (${avgWastePct.toFixed(1)}%)`;
    }

    // Resolve template variables
    const variables: Record<string, string> = {
      org_name: org.name || "Your Organization",
      reweigh_pct: avgReweighPct.toFixed(0),
      waste_pct: avgWastePct.toFixed(1),
      session_count: String(totalSessions),
      reason,
      dashboard_url: `${PLATFORM_URL}/dashboard`,
    };

    let subject = template.subject;
    let html = template.html_body;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, value);
      html = html.replace(regex, value);
    }

    // Send with platform branding (sendEmail, NOT sendOrgEmail)
    const result = await sendEmail({
      to: [org.billing_email],
      subject,
      html,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update cooldown timestamp
    await supabase
      .from("organizations")
      .update({ last_backroom_coached_at: new Date().toISOString() })
      .eq("id", org_id);

    // Increment counter
    await supabase.rpc("increment_platform_counter" as any, {
      p_key: "color_bar_coaching_emails_sent",
    }).then(() => {}).catch(() => {
      // Fallback: direct update if RPC doesn't exist
      console.log("[send-coaching-email] RPC fallback — updating counter directly");
    });

    // Direct increment as primary approach
    const { data: currentCounter } = await supabase
      .from("platform_kpi_counters")
      .select("value")
      .eq("key", "color_bar_coaching_emails_sent")
      .single();

    if (currentCounter) {
      await supabase
        .from("platform_kpi_counters")
        .update({
          value: (currentCounter.value as number) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("key", "color_bar_coaching_emails_sent");
    }

    // Audit trail
    await supabase.from("platform_audit_log").insert({
      organization_id: org_id,
      user_id: user.id,
      action: "coaching_email_sent",
      entity_type: "organization",
      entity_id: org_id,
      details: {
        recipient: org.billing_email,
        reason,
        reweigh_pct: avgReweighPct,
        waste_pct: avgWastePct,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Coaching email sent to ${org.billing_email}`,
        org_name: org.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-coaching-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
