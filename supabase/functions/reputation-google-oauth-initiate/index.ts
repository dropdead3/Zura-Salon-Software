/**
 * reputation-google-oauth-initiate
 *
 * Builds a Google OAuth authorization URL for connecting an organization's
 * Google Business Profile to the Reputation engine. Returns { url } to the
 * client; the client redirects the operator to that URL.
 *
 * State is an HMAC-signed JSON blob embedding { org_id, user_id, return_to, nonce, ts }
 * so the callback can verify authenticity without a state table.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/business.manage",
].join(" ");

const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/reputation-google-oauth-callback`;

async function signState(payload: object, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const b64 = btoa(json).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(b64));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64}.${sigB64}`;
}

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
    const { organization_id, return_to } = await req.json();

    if (!organization_id || typeof organization_id !== "string") {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is an admin of this org
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isAdmin, error: roleErr } = await admin.rpc("is_org_admin", {
      _user_id: userId, _org_id: organization_id,
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Google OAuth not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = await signState(
      {
        org_id: organization_id,
        user_id: userId,
        return_to: return_to || "/",
        nonce: crypto.randomUUID(),
        ts: Date.now(),
      },
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account consent");
    url.searchParams.set("state", state);

    return new Response(JSON.stringify({ url: url.toString() }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("initiate error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
