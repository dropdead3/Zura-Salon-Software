/**
 * Canonical clamp for the promotional-popup auto-minimize duration.
 *
 * Operators configure auto-minimize as milliseconds. Two callsites
 * (PromotionalPopup's `autoMinimizeSeconds` useMemo and its preview-reset
 * listener) need to derive the displayed countdown in seconds, clamped to
 * the supported 5–60s window with a 15s default. Centralizing keeps the
 * window + default + null-disable semantics in one place — mirrors the
 * `defineEventOwnershipSelector` factory move.
 *
 * Returns `null` when the operator explicitly disabled auto-minimize.
 */
export const AUTO_MINIMIZE_MIN_SECONDS = 5;
export const AUTO_MINIMIZE_MAX_SECONDS = 60;
export const AUTO_MINIMIZE_DEFAULT_MS = 15000;

export function clampAutoMinimizeSeconds(ms: number | null | undefined): number | null {
  if (ms === null) return null; // explicitly disabled by operator
  const value = typeof ms === 'number' && Number.isFinite(ms) ? ms : AUTO_MINIMIZE_DEFAULT_MS;
  const seconds = Math.round(value / 1000);
  return Math.max(AUTO_MINIMIZE_MIN_SECONDS, Math.min(AUTO_MINIMIZE_MAX_SECONDS, seconds));
}
