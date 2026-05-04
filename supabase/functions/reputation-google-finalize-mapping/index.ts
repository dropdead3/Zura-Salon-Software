/**
 * reputation-google-finalize-mapping
 *
 * Consumes a `oauth_pending_mappings` staging row and writes one
 * `review_platform_connections` row per (location_id, place_id) the operator
 * mapped. JWT-validated; org-admin gated.
 *
 * Body: { nonce: uuid, mappings: Array<{ location_id: string; place_id: string; gbp_label?: string }> }
 *
 * Idempotent: uses ON CONFLICT (org, location, platform) DO UPDATE.
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

    const body = await req.json();
    const { nonce, mappings } = body ?? {};
    if (!nonce || typeof nonce !== "string") {
      return new Response(JSON.stringify({ error: "nonce required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return new Response(JSON.stringify({ error: "mappings required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const m of mappings) {
      if (typeof m?.location_id !== "string" || typeof m?.place_id !== "string") {
        return new Response(JSON.stringify({ error: "invalid mapping shape" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load + lock the staging row
    const { data: pending, error: pendingErr } = await admin
      .from("oauth_pending_mappings")
      .select("*")
      .eq("nonce", nonce)
      .single();

    if (pendingErr || !pending) {
      return new Response(JSON.stringify({ error: "Staging row not found or expired" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pending.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await admin.from("oauth_pending_mappings").delete().eq("nonce", nonce);
      return new Response(JSON.stringify({ error: "Staging row expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm caller is admin of the org (defense-in-depth alongside the user_id check)
    const { data: isAdmin } = await admin.rpc("is_org_admin", {
      _user_id: userId, _org_id: pending.organization_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = pending.payload as {
      access_token: string;
      refresh_token: string | null;
      expires_at: string | null;
      scopes: string[];
      external_account_id: string | null;
      external_account_label: string | null;
      discovered_locations: Array<{ place_id: string; account_id: string; title: string }>;
    };

    // Build connection rows
    const rows = mappings.map((m) => {
      const matched = p.discovered_locations.find((d) => d.place_id === m.place_id);
      return {
        organization_id: pending.organization_id,
        location_id: m.location_id,
        platform: "google" as const,
        status: "active" as const,
        external_account_id: p.external_account_id,
        external_account_label: p.external_account_label,
        access_token: p.access_token,
        refresh_token: p.refresh_token,
        token_expires_at: p.expires_at,
        scopes: p.scopes,
        place_id: m.place_id,
        google_account_id: matched?.account_id ?? null,
        connected_by_user_id: userId,
        last_verified_at: new Date().toISOString(),
        last_error: null,
        created_by: userId,
      };
    });

    const { error: upsertErr } = await admin
      .from("review_platform_connections")
      .upsert(rows, { onConflict: "organization_id,location_id,platform" });

    if (upsertErr) {
      console.error("upsert failed", upsertErr);
      return new Response(JSON.stringify({ error: "Save failed", detail: upsertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up staging row + any legacy org-scoped (location_id IS NULL) row
    await admin.from("oauth_pending_mappings").delete().eq("nonce", nonce);
    await admin
      .from("review_platform_connections")
      .delete()
      .eq("organization_id", pending.organization_id)
      .eq("platform", "google")
      .is("location_id", null);

    return new Response(JSON.stringify({ success: true, mapped: rows.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("finalize-mapping error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
