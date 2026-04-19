/**
 * Wave 28.10 — record-policy-acknowledgment
 *
 * Public endpoint that captures a client's acknowledgment of a policy variant
 * on the public Policy Center.
 *
 * Validation chain (server-side; nothing trusted from client):
 *   - policy_id exists
 *   - policy.requires_acknowledgment = true
 *   - policy.audience IN ('external','both')
 *   - policy_variant_id matches policy.current_version_id
 *   - variant.variant_type = 'client' AND variant.approved = true
 *
 * Captures IP and User-Agent from request headers. Inserts via service role,
 * bypassing RLS but only after structural validation.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface AckPayload {
  policy_id: string;
  client_email: string;
  client_name: string;
  signature_text?: string;
  acknowledgment_method?: "typed_signature" | "checkbox" | "click";
  appointment_id?: string | null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function isUuid(s: string | undefined | null): s is string {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as Partial<AckPayload>;

    // ---- Input validation ----
    if (!isUuid(body.policy_id)) {
      return new Response(JSON.stringify({ error: "Invalid policy_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const clientEmail = (body.client_email ?? "").trim().toLowerCase();
    const clientName = (body.client_name ?? "").trim();
    const signatureText = (body.signature_text ?? clientName).trim();
    const method = body.acknowledgment_method ?? "typed_signature";

    if (!isValidEmail(clientEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (clientName.length < 1 || clientName.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (signatureText.length < 1 || signatureText.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["typed_signature", "checkbox", "click"].includes(method)) {
      return new Response(JSON.stringify({ error: "Invalid method" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.appointment_id != null && !isUuid(body.appointment_id)) {
      return new Response(JSON.stringify({ error: "Invalid appointment_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Structural validation: policy must exist, require ack, be external ----
    const { data: policy, error: pErr } = await supabase
      .from("policies")
      .select("id, organization_id, audience, status, current_version_id, requires_acknowledgment")
      .eq("id", body.policy_id)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!policy) {
      return new Response(JSON.stringify({ error: "Policy not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!policy.requires_acknowledgment) {
      return new Response(
        JSON.stringify({ error: "Policy does not require acknowledgment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!["external", "both"].includes(policy.audience)) {
      return new Response(JSON.stringify({ error: "Policy is not client-facing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!policy.current_version_id) {
      return new Response(JSON.stringify({ error: "Policy has no published version" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Resolve approved client variant for current version ----
    const { data: variant, error: vErr } = await supabase
      .from("policy_variants")
      .select("id, version_id, variant_type, approved")
      .eq("version_id", policy.current_version_id)
      .eq("variant_type", "client")
      .eq("approved", true)
      .maybeSingle();

    if (vErr) throw vErr;
    if (!variant) {
      return new Response(
        JSON.stringify({ error: "No approved client variant available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Capture audit metadata ----
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent");

    // ---- Insert acknowledgment ----
    const { data: ack, error: insErr } = await supabase
      .from("policy_acknowledgments")
      .insert({
        organization_id: policy.organization_id,
        policy_id: policy.id,
        policy_version_id: policy.current_version_id,
        policy_variant_id: variant.id,
        surface: "client_policy_center", // existing required column
        evidence: {
          source: "client_policy_center",
          method,
          signature_text: signatureText,
        },
        client_email: clientEmail,
        client_name: clientName,
        signature_text: signatureText,
        acknowledgment_method: method,
        ip_address: ipAddress,
        user_agent: userAgent,
        appointment_id: body.appointment_id ?? null,
      })
      .select("id, acknowledged_at")
      .single();

    if (insErr) {
      console.error("Insert error:", insErr);
      throw insErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        acknowledgment_id: ack.id,
        acknowledged_at: ack.acknowledged_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("record-policy-acknowledgment error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
