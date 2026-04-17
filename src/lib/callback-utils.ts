/**
 * Hospitality callbacks — stale filter doctrine.
 *
 * Single source of truth for "alert-fatigue safe" callback visibility.
 * FILTER: trigger_date < now() - STALE_DAYS hidden as stale.
 * Imported by both useClientCallbacks (per-client) and useOrgActiveCallbacks
 * (org-wide grid lookup) to prevent drift.
 */
export const STALE_DAYS = 90;

export interface StaleableCallback {
  trigger_date: string | null;
}

export function isCallbackStale(cb: StaleableCallback): boolean {
  if (!cb.trigger_date) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_DAYS);
  return new Date(cb.trigger_date) < cutoff;
}
