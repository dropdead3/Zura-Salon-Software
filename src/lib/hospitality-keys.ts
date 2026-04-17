/**
 * Hospitality client-key resolver — universal identity for hospitality data
 * (About facts, callbacks) across both Phorest-linked and Zura-native clients.
 *
 * DOCTRINE: Hospitality must work without Phorest connectivity
 * (see `phorest-decoupling-and-zura-native-operations`). Zura-native bookings
 * write `client_id UUID` and leave `phorest_client_id` NULL — keying off
 * `phorest_client_id` alone hides the hospitality layer on ~44% of appointments.
 *
 * Resolution order: phorest_client_id (legacy continuity) → client_id (Zura UUID).
 * Both are stored in `client_callbacks.client_id TEXT` / `client_about_facts.client_id TEXT`.
 *
 * Trade-off: a client booked under both rails will have split memory until
 * the P2 cleanup centralizes on `clients.id`. Acceptable for current scale.
 */
export interface HospitalityKeySource {
  phorest_client_id?: string | null;
  client_id?: string | null;
  /** Bare client row id fallback (e.g. when the source is `clients` directly). */
  id?: string | null;
}

export function getHospitalityClientKey(
  source: HospitalityKeySource | null | undefined,
): string | null {
  if (!source) return null;
  return source.phorest_client_id || source.client_id || source.id || null;
}
