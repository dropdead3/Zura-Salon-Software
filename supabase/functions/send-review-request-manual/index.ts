// Manual review request send for a single appointment.
//
// Operator-triggered from the queue / appointment UI. Bypasses the eligibility
// scan but still respects the frequency cap (overridable via `force: true`).
// Creates a `client_feedback_responses` row, sends via Twilio SMS using the
// `review_request_default` template, stamps `review_compliance_log`.
//
// Auth: requires authenticated org admin / manager (RLS on org membership
// is enforced by the manual_actor check).
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

interface Body {
  appointment_id: string;
  force?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const actorId = userRes?.user?.id;
    if (!actorId) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json();
    if (!body.appointment_id) {
      return new Response(JSON.stringify({ error: "appointment_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select("id, organization_id, location_id, client_id, client_name, client_phone, status")
      .eq("id", body.appointment_id)
      .single();
    if (apptErr || !appt) {
      return new Response(JSON.stringify({ error: "appointment_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: actor must be an org admin/manager
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: actorId, _organization_id: appt.organization_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appt.client_phone) {
      return new Response(JSON.stringify({ error: "no_phone_on_file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Frequency cap (default 90d) unless force=true
    if (!body.force && appt.client_id) {
      const cutoff = new Date(Date.now() - 90 * 86400 * 1000).toISOString();
      const { count } = await supabase
        .from("review_request_dispatch_queue")
        .select("id", { head: true, count: "exact" })
        .eq("organization_id", appt.organization_id)
        .eq("client_id", appt.client_id)
        .not("sent_at", "is", null)
        .gte("sent_at", cutoff);
      if ((count ?? 0) > 0) {
        return new Response(JSON.stringify({ error: "frequency_cap_hit", hint: "pass force:true to override" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Resolve / auto-create default survey
    let { data: survey } = await supabase
      .from("client_feedback_surveys")
      .select("id")
      .eq("organization_id", appt.organization_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!survey) {
      const { data: created, error: e1 } = await supabase.from("client_feedback_surveys").insert({
        organization_id: appt.organization_id,
        name: "Default Post-Appointment Feedback",
        description: "Auto-created by Reputation Engine.",
        trigger_type: "post_appointment",
        is_active: true,
      }).select("id").single();
      if (e1) throw e1;
      survey = created;
    }

    const responseToken = crypto.randomUUID().replace(/-/g, "");
    const { data: response, error: respErr } = await supabase.from("client_feedback_responses").insert({
      organization_id: appt.organization_id,
      survey_id: survey.id,
      appointment_id: appt.id,
      client_id: appt.client_id,
      token: responseToken,
      expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    }).select("id").single();
    if (respErr) throw respErr;

    const { data: org } = await supabase.from("organizations").select("name").eq("id", appt.organization_id).single();
    const firstName = (appt.client_name ?? "there").split(" ")[0];
    const feedbackUrl = `${PUBLIC_FEEDBACK_BASE}?token=${responseToken}`;

    const result = await sendSms(supabase, {
      to: appt.client_phone,
      templateKey: "review_request_default",
      variables: {
        client_first_name: firstName,
        business_name: org?.name ?? "our salon",
        feedback_url: feedbackUrl,
      },
    }, appt.organization_id);

    // Record in dispatch queue (manual rule_id = null)
    await supabase.from("review_request_dispatch_queue").insert({
      organization_id: appt.organization_id,
      appointment_id: appt.id,
      rule_id: null,
      client_id: appt.client_id,
      client_phone: appt.client_phone,
      channel: "sms",
      scheduled_for: new Date().toISOString(),
      sent_at: result.success ? new Date().toISOString() : null,
      survey_response_id: response.id,
      attempts: 1,
      last_error: result.success ? null : result.error,
    });

    await supabase.from("review_compliance_log").insert({
      organization_id: appt.organization_id,
      actor_user_id: actorId,
      event_type: result.success ? "review_request_sent_manual" : "review_request_failed_manual",
      feedback_response_id: response.id,
      payload: { channel: "sms", forced: !!body.force, error: result.error ?? null },
    });

    return new Response(JSON.stringify({ ok: result.success, error: result.error ?? null, response_id: response.id }), {
      status: result.success ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[send-review-request-manual] fatal:", e?.message ?? e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
