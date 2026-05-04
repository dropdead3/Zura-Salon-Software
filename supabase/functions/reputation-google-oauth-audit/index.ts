/**
 * reputation-google-oauth-audit
 *
 * Operator-side telemetry for the Switch Google account flow. Writes a
 * lightweight row to `reputation_admin_actions` (platform-only RLS, so we
 * use the service-role client) so platform CS can correlate operator
 * confusion without DB diving.
 *
 * Accepts: { organization_id, stage: 'switch_initiated' | 'switch_detected'
 *           | 'switch_timeout' | 'switch_retry', metadata? }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_STAGES = new Set([
  "switch_initiated",
  "switch_detected",
  "switch_timeout",
  "switch_retry",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { organization_id, stage, metadata } = body ?? {};
    if (!organization_id || typeof organization_id !== "string" ||
        !stage || !ALLOWED_STAGES.has(stage)) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is an admin of the org. NOTE: the RPC arg is `_org_id`
    // (NOT `_organization_id`) — mismatched names silently return false → 403.
    const { data: isAdmin } = await userClient.rpc("is_org_admin", {
      _user_id: user.id, _org_id: organization_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const safeMeta = (typeof metadata === "object" && metadata !== null) ? metadata : {};
    await admin.from("reputation_admin_actions").insert({
      actor_user_id: user.id,
      target_organization_id: organization_id,
      action_type: `google_oauth.${stage}`,
      reason: null,
      metadata: { ...safeMeta, source: "operator_switch_flow" },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("audit insert failed", e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
