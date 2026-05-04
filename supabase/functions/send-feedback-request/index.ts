// Operator-triggered email feedback request for a single appointment.
//
// Hardened to mirror send-review-request-manual:
//   - Bearer JWT required; actor must be an org admin/manager
//   - Reputation kill switch (manual_send_disabled) gate
//   - Reputation entitlement gate (organization_feature_flags)
//   - Auto-create / lookup default survey, attach survey_id
//   - Compliance log write
//   - Zod-validated body
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { sendOrgEmail } from "../_shared/email-sender.ts";
import { checkReputationKillSwitch } from "../_shared/reputation-kill-switch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BodySchema = z.object({
  organizationId: z.string().uuid(),
  clientId: z.string().uuid(),
  clientEmail: z.string().email().max(254),
  clientName: z.string().min(1).max(255),
  appointmentId: z.string().uuid().optional(),
  staffUserId: z.string().uuid().nullable().optional(),
  staffName: z.string().max(255).nullable().optional(),
  serviceName: z.string().max(255).nullable().optional(),
  baseUrl: z.string().url(),
});

function jsonResp(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth: validate caller JWT ───────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return jsonResp(401, { error: "unauthenticated" });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const actorId = userRes?.user?.id;
    if (!actorId) return jsonResp(401, { error: "unauthenticated" });

    // ── Body validation ────────────────────────────────────────────────
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonResp(400, { error: "invalid_body", issues: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY) as any;

    // ── Authorization: actor must be admin/manager of this org ─────────
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: actorId,
      _org_id: body.organizationId,
    });
    if (!isAdmin) return jsonResp(403, { error: "forbidden" });

    // ── Kill-switch gate (manual sends) ────────────────────────────────
    const guard = await checkReputationKillSwitch("manual_send_disabled", supabase);
    if (guard.blocked) {
      return jsonResp(503, { error: guard.reason, message: guard.message });
    }

    // ── Entitlement gate ───────────────────────────────────────────────
    const { data: flag } = await supabase
      .from("organization_feature_flags")
      .select("is_enabled")
      .eq("organization_id", body.organizationId)
      .eq("flag_key", "reputation_enabled")
      .maybeSingle();
    if (!flag?.is_enabled) {
      return jsonResp(402, { error: "reputation_subscription_required" });
    }

    // ── Resolve / auto-create default survey (matches dispatcher doctrine) ──
    let { data: survey } = await supabase
      .from("client_feedback_surveys")
      .select("id")
      .eq("organization_id", body.organizationId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!survey) {
      const { data: created, error: e1 } = await supabase
        .from("client_feedback_surveys")
        .insert({
          organization_id: body.organizationId,
          name: "Default Post-Appointment Feedback",
          description: "Auto-created by Reputation Engine.",
          trigger_type: "post_appointment",
          is_active: true,
        })
        .select("id")
        .single();
      if (e1) throw e1;
      survey = created;
    }

    // ── Create response token ──────────────────────────────────────────
    const responseToken =
      crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

    const { data: response, error: insertError } = await supabase
      .from("client_feedback_responses")
      .insert({
        organization_id: body.organizationId,
        survey_id: survey.id,
        client_id: body.clientId,
        appointment_id: body.appointmentId ?? null,
        staff_user_id: body.staffUserId ?? null,
        token: responseToken,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (insertError) throw new Error("Failed to create feedback request");

    const feedbackUrl = `${body.baseUrl}/feedback?token=${responseToken}`;

    // ── Send email (sendOrgEmail respects opt-outs + injects unsubscribe) ──
    const emailResult = await sendOrgEmail(supabase, body.organizationId, {
      to: [body.clientEmail],
      subject: "We'd love your feedback!",
      clientId: body.clientId,
      emailType: "feedback",
      html: `
        <p>Hi ${body.clientName},</p>
        <p>Thank you for visiting us${body.staffName ? ` and seeing ${body.staffName}` : ''}${body.serviceName ? ` for your ${body.serviceName}` : ''}!</p>
        <p>We'd love to hear about your experience. Your feedback helps us continue to provide excellent service.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${feedbackUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600;">
            Share Your Feedback
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 7 days.</p>
      `,
    });

    // ── Compliance log ─────────────────────────────────────────────────
    await supabase.from("review_compliance_log").insert({
      organization_id: body.organizationId,
      actor_user_id: actorId,
      event_type: "feedback_request_sent_manual_email",
      feedback_response_id: response.id,
      payload: { channel: "email", appointment_id: body.appointmentId ?? null },
    });

    return jsonResp(200, { success: true, token: responseToken, email_result: emailResult });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-feedback-request] error:", errorMessage);
    return jsonResp(500, { error: errorMessage });
  }
});
