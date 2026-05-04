// Intentional violation fixture for the org-scope RPC alias lint rule.
// DO NOT "fix" this file — the test asserts that the lint rule fires here.
//
// Mirrors the silent-NULL bug: passing `_organization_id` to
// `is_org_admin` / `is_org_member` makes the RPC return NULL and
// authorization checks fall through (production bug history:
// `policy-draft-variants` + reputation OAuth audit telemetry).

declare const supabase: any;

export async function bannedAdminAliasCall(userId: string, orgId: string) {
  // BANNED: `_organization_id` is not the RPC arg name.
  return supabase.rpc('is_org_admin', {
    _user_id: userId,
    _organization_id: orgId,
  });
}

export async function bannedMemberAliasCall(userId: string, orgId: string) {
  return supabase.rpc('is_org_member', {
    _user_id: userId,
    _organization_id: orgId,
  });
}
