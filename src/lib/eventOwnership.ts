/**
 * Typed helper for the CustomEvent Ownership canon.
 *
 * Folds the per-dispatch `// eslint-disable-next-line no-restricted-syntax`
 * comment into a single place so owner modules (`siteSettingsDraft.ts`,
 * `promoPopupPreviewReset.ts`, …) become one-liners and contributors
 * never have to re-justify the override.
 *
 * Why it's safe to centralize the override here:
 *   - This file is, by definition, the canonical dispatch point. The
 *     `defineEventOwnershipSelector(...)` rule fires on the *literal*
 *     event name — when callers pass the name as a typed parameter, the
 *     selector still hits this site (one inline disable, exactly here),
 *     not the call sites.
 *   - `defineEventOwnershipSelector` continues to require an `owner`
 *     module per event; this helper does not relax that requirement —
 *     it only removes per-dispatch boilerplate inside the owner.
 *
 * Pair with `defineEventOwnershipSelector({ event, owner, dispatcher })`
 * in `eslint.helpers.js`.
 */

export interface OwnedEventDispatchOptions {
  /**
   * Window target. Defaults to `window`. Tests can pass a mock target.
   * SSR-safe: if no window is reachable, the dispatch is skipped.
   */
  target?: EventTarget | null;
}

/**
 * Construct + dispatch a `CustomEvent` whose name is owned by exactly one
 * module. The single inline `eslint-disable` below is the entire reason
 * this helper exists — every other dispatcher in the codebase calls
 * `dispatchOwnedEvent(...)` instead of `new CustomEvent(...)`.
 *
 * SSR-safe: returns `false` (no-op) when `window` is unavailable and no
 * explicit target is provided.
 */
export function dispatchOwnedEvent<TDetail>(
  name: string,
  detail: TDetail,
  options: OwnedEventDispatchOptions = {},
): boolean {
  const target =
    options.target !== undefined
      ? options.target
      : typeof window === 'undefined'
        ? null
        : window;
  if (!target) return false;
  // eslint-disable-next-line no-restricted-syntax -- Canonical centralized owner-event dispatcher; per-event ownership is enforced by `defineEventOwnershipSelector` entries in eslint.helpers.js.
  const event = new CustomEvent<TDetail>(name, { detail });
  return target.dispatchEvent(event);
}
