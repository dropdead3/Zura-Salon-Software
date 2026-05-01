/**
 * Canonical clamp + coercion for the promotional-popup auto-minimize duration.
 *
 * Two boundaries:
 *
 * 1. `coerceAutoMinimizeMs(input)` — write-path. Called from the editor's
 *    `handleChange('autoMinimizeMs', …)` so only canonical values
 *    (null | clamped milliseconds in the 5000–60000 range) ever reach
 *    `site_settings.popup_config.autoMinimizeMs`. Makes the DB the source
 *    of truth instead of relying on the renderer to absorb garbage.
 *
 * 2. `clampAutoMinimizeSeconds(ms)` — read-path. Defensive clamp at render
 *    time for legacy/back-compat reads (rows written before the write-path
 *    coercion shipped). Once the column is backfilled, the non-finite +
 *    out-of-range branches here become dead code.
 *
 * Both share the same window/default constants below.
 */
export const AUTO_MINIMIZE_MIN_SECONDS = 5;
export const AUTO_MINIMIZE_MAX_SECONDS = 60;
export const AUTO_MINIMIZE_DEFAULT_MS = 15000;
export const AUTO_MINIMIZE_MIN_MS = AUTO_MINIMIZE_MIN_SECONDS * 1000;
export const AUTO_MINIMIZE_MAX_MS = AUTO_MINIMIZE_MAX_SECONDS * 1000;

/**
 * Read-path clamp. Returns seconds in [5, 60], `null` when explicitly
 * disabled, or 15s default when the stored value is missing/garbage.
 */
export function clampAutoMinimizeSeconds(ms: number | null | undefined): number | null {
  if (ms === null) return null; // explicitly disabled by operator
  const value = typeof ms === 'number' && Number.isFinite(ms) ? ms : AUTO_MINIMIZE_DEFAULT_MS;
  const seconds = Math.round(value / 1000);
  return Math.max(AUTO_MINIMIZE_MIN_SECONDS, Math.min(AUTO_MINIMIZE_MAX_SECONDS, seconds));
}

/**
 * Write-path coercion. Accepts any operator-shaped input (number of ms,
 * a numeric string from an `<Input type="number">`, the empty string, or
 * `null`) and returns the canonical value to persist:
 *
 *  - `null` for "disabled" (empty string + explicit null)
 *  - clamped, rounded-to-the-second milliseconds otherwise
 *  - `AUTO_MINIMIZE_DEFAULT_MS` for non-finite garbage (NaN/Infinity)
 *
 * Round-trip safe: `coerceAutoMinimizeMs(coerceAutoMinimizeMs(x)) === coerceAutoMinimizeMs(x)`.
 */
export function coerceAutoMinimizeMs(input: number | string | null | undefined): number | null {
  if (input === null) return null;
  if (input === undefined || input === '') return null;
  const numeric = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(numeric)) return AUTO_MINIMIZE_DEFAULT_MS;
  // Snap to whole seconds so the editor's "Auto-minimize after (seconds)"
  // field round-trips cleanly without sub-second drift.
  const snappedMs = Math.round(numeric / 1000) * 1000;
  return Math.max(AUTO_MINIMIZE_MIN_MS, Math.min(AUTO_MINIMIZE_MAX_MS, snappedMs));
}
