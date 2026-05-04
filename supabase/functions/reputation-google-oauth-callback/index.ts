/**
 * reputation-google-oauth-callback
 *
 * Public endpoint Google redirects to after operator consent. Verifies the
 * signed state, exchanges the auth code for tokens, then discovers every
 * Google Business Profile the authorizing account can manage. Stashes the
 * tokens + discovered locations in `oauth_pending_mappings` (15min TTL) and
 * redirects the operator to the GBP-to-location mapping picker.
 *
 * NOTE: this function is unauthenticated (no JWT) — Google does the redirect.
 * Authenticity comes from the HMAC-signed state.
 *
 * GBP-to-Location Federation Contract: see mem://features/reputation-engine.md
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
    if (Date.now() - payload.ts > 10 * 60 * 1000) return null;
    return payload;
  } catch { return null; }
}

function htmlRedirect(url: string, message: string): Response {
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

interface GBPLocation {
  place_id: string;
  resource_name: string; // e.g. "accounts/123/locations/456"
  account_id: string;
  title: string;
  address?: string;
}

/**
 * Fetch all GBP locations the access_token can manage.
 * Uses Account Management API + Business Information API (current generation;
 * legacy My Business v4 was deprecated). Best-effort: returns [] on failure
 * so the operator can still proceed and use manual review URLs.
 */
async function discoverGBPLocations(accessToken: string): Promise<GBPLocation[]> {
  try {
    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!accountsRes.ok) {
      console.warn("accounts list failed", accountsRes.status, await accountsRes.text());
      return [];
    }
    const accountsData = await accountsRes.json();
    const accounts: Array<{ name: string }> = accountsData.accounts ?? [];
    const all: GBPLocation[] = [];

    for (const acct of accounts) {
      // acct.name is "accounts/{id}"
      const accountId = acct.name.replace("accounts/", "");
      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=name,title,storefrontAddress,metadata.placeId`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!locRes.ok) {
        console.warn("locations list failed", acct.name, locRes.status);
        continue;
      }
      const locData = await locRes.json();
      const locations: Array<any> = locData.locations ?? [];
      for (const loc of locations) {
        const placeId = loc?.metadata?.placeId;
        if (!placeId) continue; // unverified listings don't have a place id
        const addr = loc?.storefrontAddress;
        const addressStr = addr
          ? [addr.addressLines?.join(" "), addr.locality, addr.administrativeArea].filter(Boolean).join(", ")
          : undefined;
        all.push({
          place_id: placeId,
          resource_name: loc.name,
          account_id: accountId,
          title: loc.title ?? "(untitled)",
          address: addressStr,
        });
      }
    }
    return all;
  } catch (e) {
    console.error("GBP discovery failed", e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
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

    // Discover GBP locations the operator can manage. Best-effort.
    const discovered = await discoverGBPLocations(tokens.access_token);
    console.log(`Discovered ${discovered.length} GBP locations for org ${payload.org_id}`);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Stash in pending mappings table for the picker step
    const { data: pending, error: insertErr } = await admin
      .from("oauth_pending_mappings")
      .insert({
        organization_id: payload.org_id,
        user_id: payload.user_id,
        provider: "google",
        payload: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          expires_at: expiresAt,
          scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
          external_account_id: userinfo.sub ?? null,
          external_account_label: userinfo.email ?? null,
          discovered_locations: discovered,
        },
      })
      .select("nonce")
      .single();

    if (insertErr || !pending) {
      console.error("pending mapping insert failed", insertErr);
      return htmlRedirect(`${appBase}/?google_oauth_error=staging_failed`, "Could not stage mapping");
    }

    // Redirect to mapping page with nonce. Client-side router resolves the org slug.
    const returnTo = `/dashboard/admin/feedback/connect-google?nonce=${pending.nonce}`;
    return htmlRedirect(`${appBase}${returnTo}`, "Connecting Google…");
  } catch (e) {
    console.error("callback error", e);
    return htmlRedirect(`${appBase}/?google_oauth_error=internal`, "Connection failed");
  }
});
