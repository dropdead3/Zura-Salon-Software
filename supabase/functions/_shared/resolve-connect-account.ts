/**
 * Shared helper: resolve the Stripe Connect account ID for a payment operation.
 *
 * Resolution chain (location-first):
 *   1. locations.stripe_account_id (location's own Express account)
 *   2. organizations.stripe_connect_account_id (org default)
 *   3. Error
 */
export async function resolveConnectAccount(
  supabase: any,
  organizationId: string,
  locationId?: string | null
): Promise<string> {
  // 1. Try location-specific account
  if (locationId) {
    const { data: loc } = await supabase
      .from("locations")
      .select("stripe_account_id")
      .eq("id", locationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (loc?.stripe_account_id) {
      return loc.stripe_account_id;
    }
  }

  // 2. Fall back to org-level account
  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_connect_account_id")
    .eq("id", organizationId)
    .maybeSingle();

  if (org?.stripe_connect_account_id) {
    return org.stripe_connect_account_id;
  }

  throw new Error("No payment account configured for this organization or location");
}