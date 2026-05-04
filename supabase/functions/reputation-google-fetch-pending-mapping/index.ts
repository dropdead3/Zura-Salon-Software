/**
 * reputation-google-fetch-pending-mapping
 *
 * Returns the discovered GBP locations + the operator's Zura locations for the
 * mapping picker. JWT-validated; org-admin gated. Does NOT return the access
 * token — only the discoverable shape.
 *
 * Body: { nonce: uuid }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const { nonce } = await req.json();
    if (!nonce || typeof nonce !== "string") {
      return new Response(JSON.stringify({ error: "nonce required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pending, error: pErr } = await admin
      .from("oauth_pending_mappings")
      .select("organization_id, user_id, payload, expires_at")
      .eq("nonce", nonce)
      .single();

    if (pErr || !pending) {
      return new Response(JSON.stringify({ error: "Not found or expired" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pending.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(pending.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = pending.payload as {
      external_account_label: string | null;
      discovered_locations: Array<{ place_id: string; account_id: string; title: string; address?: string }>;
    };

    // Pull Zura locations for this org. Already mapped (place_id present) returned for pre-fill.
    const { data: zuraLocations } = await admin
      .from("locations")
      .select("id, name, is_active")
      .eq("organization_id", pending.organization_id);

    const { data: existingConnections } = await admin
      .from("review_platform_connections")
      .select("location_id, place_id")
      .eq("organization_id", pending.organization_id)
      .eq("platform", "google");

    return new Response(JSON.stringify({
      organization_id: pending.organization_id,
      google_account_label: p.external_account_label,
      discovered_locations: p.discovered_locations,
      zura_locations: (zuraLocations ?? []).filter((l: any) => l.is_active !== false),
      existing_mappings: existingConnections ?? [],
      expires_at: pending.expires_at,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-pending error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
