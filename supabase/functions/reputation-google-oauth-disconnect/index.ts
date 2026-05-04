/**
 * reputation-google-oauth-disconnect
 *
 * Revokes the stored Google OAuth token (best-effort) and deletes the
 * `review_platform_connections` row for the caller's organization.
 *
 * Auth: requires a valid user JWT. Authorization is checked via
 * `is_org_admin(auth.uid(), organization_id)`.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client — verify caller identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "invalid_auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id, location_id } = await req.json().catch(() => ({}));
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "missing_organization_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // location_id optional: when provided, disconnect only that location's connection.

    // Authorization: must be org admin
    const { data: isAdmin, error: adminErr } = await userClient.rpc("is_org_admin", {
      _user_id: userData.user.id,
      _org_id: organization_id,
    });
    if (adminErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch tokens to revoke (scope to location if provided)
    let fetchQuery = admin
      .from("review_platform_connections")
      .select("id, refresh_token, access_token")
      .eq("organization_id", organization_id)
      .eq("platform", "google");
    if (location_id) fetchQuery = fetchQuery.eq("location_id", location_id);
    const { data: rows } = await fetchQuery;

    // Best-effort revoke at Google. NOTE: revoking one row's token will revoke
    // ALL sibling locations' tokens too (they share a grant). Only revoke at
    // Google when this is the LAST remaining row for the org.
    const { count: remainingCount } = await admin
      .from("review_platform_connections")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization_id)
      .eq("platform", "google");

    const willBeLast = !location_id || (remainingCount ?? 0) <= (rows?.length ?? 0);
    if (willBeLast) {
      for (const row of rows ?? []) {
        const token = row.refresh_token || row.access_token;
        if (!token) continue;
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });
        } catch (e) {
          console.warn("revoke failed (continuing)", e);
        }
      }
    }

    let delQuery = admin
      .from("review_platform_connections")
      .delete()
      .eq("organization_id", organization_id)
      .eq("platform", "google");
    if (location_id) delQuery = delQuery.eq("location_id", location_id);
    const { error: delErr } = await delQuery;

    if (delErr) {
      console.error("delete failed", delErr);
      return new Response(JSON.stringify({ error: "db_delete_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("disconnect error", e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
