/**
 * Shared CORS configuration for user-facing edge functions.
 * Restricts origins to production domains and Lovable preview URLs.
 */

const ALLOWED_ORIGINS: (string | RegExp)[] = [
  "https://getzura.com",
  "https://www.getzura.com",
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovableproject\.com$/,
];

const CORS_HEADERS_BASE: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Returns CORS headers with the origin set to the request origin if it's allowed,
 * or empty Access-Control-Allow-Origin if not.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";

  const isAllowed = ALLOWED_ORIGINS.some((allowed: any) => {
    if (typeof allowed === "string") return allowed === origin;
    return allowed.test(origin);
  });

  return {
    ...CORS_HEADERS_BASE,
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
  };
}

/**
 * Wildcard CORS for webhooks/cron functions that are called server-to-server.
 */
export const wildcardCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
