/**
 * reputation-google-oauth-callback
 *
 * Public endpoint Google redirects to after operator consent. Verifies the
 * signed state, exchanges the auth code for tokens, then upserts a row in
 * `review_platform_connections` (status='active'). Finally redirects the
 * operator back to the dashboard with ?google_connected=1.
 *
 * NOTE: this function is unauthenticated (no JWT) — Google does the redirect.
 * Authenticity comes from the HMAC-signed state.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/reputation-google-oauth-callback`;

function b64UrlDecode(s: string): string {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
}

async function verifyState(state: string, secret: string): Promise<any | null> {
  const [b64, sigB64] = state.split(".");
  if (!b64 || !sigB64) return null;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  const sigBytes = Uint8Array.from(b64UrlDecode(sigB64), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(b64));
  if (!ok) return null;
  try {
    const payload = JSON.parse(b64UrlDecode(b64));
    // Reject states older than 10 minutes
    if (Date.now() - payload.ts > 10 * 60 * 1000) return null;
    return payload;
  } catch { return null; }
}

function htmlRedirect(url: string, message: string): Response {
  // Use a real 302 redirect (most reliable across browsers and popup-blocker contexts).
  // Fallback HTML body with meta-refresh + manual link in case the client ignores Location.
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${message}</title>
     <meta http-equiv="refresh" content="0; url=${url}"></head>
     <body style="font-family:system-ui;padding:2rem;text-align:center">
     <p>${message}</p><p><a href="${url}">Continue</a></p></body></html>`,
    {
      status: 302,
      headers: {
        "Location": url,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  // Redirect base MUST come from server config — never the request `Origin`
  // header (attacker-controllable in cross-site contexts → open-redirect).
  const appBase = Deno.env.get("APP_BASE_URL") ||
    "https://id-preview--b06a5744-64b6-4629-9f76-e0e2cb73ea52.lovable.app";

  try {
    if (error) return htmlRedirect(`${appBase}/?google_oauth_error=${encodeURIComponent(error)}`, "Connection cancelled");
    if (!code || !state) return htmlRedirect(`${appBase}/?google_oauth_error=missing_params`, "Missing parameters");

    const payload = await verifyState(state, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!payload) return htmlRedirect(`${appBase}/?google_oauth_error=invalid_state`, "Invalid state");

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("token exchange failed", tokens);
      return htmlRedirect(`${appBase}/?google_oauth_error=token_exchange`, "Token exchange failed");
    }

    // Fetch userinfo for label
    const uiRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userinfo = uiRes.ok ? await uiRes.json() : {};

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: upsertErr } = await admin
      .from("review_platform_connections")
      .upsert({
        organization_id: payload.org_id,
        location_id: null,
        platform: "google",
        status: "active",
        external_account_id: userinfo.sub ?? null,
        external_account_label: userinfo.email ?? null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: expiresAt,
        scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
        last_error: null,
        created_by: payload.user_id,
      }, { onConflict: "organization_id,location_id,platform" });

    if (upsertErr) {
      console.error("upsert failed", upsertErr);
      return htmlRedirect(`${appBase}/?google_oauth_error=db_write`, "Failed to save connection");
    }

    const returnTo = payload.return_to || "/";
    const sep = returnTo.includes("?") ? "&" : "?";
    return htmlRedirect(`${appBase}${returnTo}${sep}google_connected=1`, "Connected — redirecting");
  } catch (e) {
    console.error("callback error", e);
    return htmlRedirect(`${appBase}/?google_oauth_error=server_error`, "Server error");
  }
});
