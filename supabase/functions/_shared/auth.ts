import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Use a permissive admin-client type so this helper works across edge functions
// without forcing every caller to align on the generated Database generics.
// The Supabase v2 SDK's generated generics are extremely strict; using `any`
// here keeps every caller (ai-agent-chat, ai-assistant, etc.) compiling.
// deno-lint-ignore no-explicit-any
export type AdminClient = any;

export interface AuthResult {
  user: { id: string; email?: string };
  supabaseAdmin: AdminClient;
}

/**
 * Extracts and validates the Bearer token from the request.
 * Returns the authenticated user and an admin Supabase client.
 * Throws a structured error if auth fails.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Missing or invalid Authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey) as AdminClient;

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    throw { status: 401, message: "Invalid or expired token" };
  }

  return { user: data.user, supabaseAdmin };
}

/**
 * Validates that the authenticated user is a member of the given organization.
 */
export async function requireOrgMember(
  supabaseAdmin: AdminClient,
  userId: string,
  organizationId: string
): Promise<void> {
  if (!organizationId) {
    throw { status: 400, message: "organizationId is required" };
  }

  const { data, error } = await supabaseAdmin.rpc("is_org_member", {
    _user_id: userId,
    _org_id: organizationId,
  });

  if (error || !data) {
    throw { status: 403, message: "You do not have access to this organization" };
  }
}

/**
 * Validates that the authenticated user is an admin of the given organization.
 */
export async function requireOrgAdmin(
  supabaseAdmin: AdminClient,
  userId: string,
  organizationId: string
): Promise<void> {
  if (!organizationId) {
    throw { status: 400, message: "organizationId is required" };
  }

  const { data, error } = await supabaseAdmin.rpc("is_org_admin", {
    _user_id: userId,
    _org_id: organizationId,
  });

  if (error || !data) {
    throw { status: 403, message: "Admin access required for this operation" };
  }
}

/**
 * Returns an error Response for auth failures.
 */
export function authErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>
): Response {
  const status = typeof err === "object" && err !== null && "status" in err
    ? (err as { status: number }).status
    : 500;
  const message = typeof err === "object" && err !== null && "message" in err
    ? (err as { message: string }).message
    : "Internal server error";

  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
