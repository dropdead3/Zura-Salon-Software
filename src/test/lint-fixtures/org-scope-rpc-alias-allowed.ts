// Intentional ALLOWED fixture for the org-scope RPC alias lint rule.
// Uses the canonical `_org_id` arg — must NOT be flagged.
declare const supabase: any;

export async function allowedAdminCall(userId: string, orgId: string) {
  return supabase.rpc('is_org_admin', { _user_id: userId, _org_id: orgId });
}

export async function allowedMemberCall(userId: string, orgId: string) {
  return supabase.rpc('is_org_member', { _user_id: userId, _org_id: orgId });
}
