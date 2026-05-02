/**
 * Active hero alignment signal.
 *
 * The hero (rotating slides + static hero) publishes its currently active
 * `content_alignment` to `<html data-hero-alignment="left|center|right">`.
 * Other layers MAY observe this signal to make section-aware decisions
 * without coupling to the hero component tree.
 *
 * NON-CONSUMERS (intentional):
 *   - PromotionalPopup FAB ("See Offer"). The FAB is a global anchored
 *     affordance and must NOT reposition based on section-level layout.
 *     Operators read positional drift on slide change as a bug. Z-layering
 *     (z-50) is the correct separation between FAB and hero, not viewport
 *     repositioning. See `mem://style/global-overlay-stability`.
 *
 * Why a DOM attribute and not a context/store?
 *   - Any future consumer is likely to live OUTSIDE the hero subtree.
 *   - The hero is mounted in the public-site route only; a context would
 *     leak hero-specific concerns into Layout.
 *   - A single root attribute is observable via MutationObserver at zero
 *     coupling cost and is trivially cleaned up on unmount.
 */

export type HeroAlignmentSignal = 'left' | 'center' | 'right';

const ATTR = 'data-hero-alignment';

/** Write the active hero alignment to the document root. */
export function publishHeroAlignment(alignment: HeroAlignmentSignal): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(ATTR, alignment);
}

/** Clear the signal (called on hero unmount). */
export function clearHeroAlignment(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.removeAttribute(ATTR);
}

/** Read the current signal. Returns `null` when no hero is mounted. */
export function readHeroAlignment(): HeroAlignmentSignal | null {
  if (typeof document === 'undefined') return null;
  const value = document.documentElement.getAttribute(ATTR);
  if (value === 'left' || value === 'center' || value === 'right') return value;
  return null;
}

/**
 * Subscribe to hero-alignment changes. Calls `cb` immediately with the
 * current value and on every subsequent change. Returns an unsubscribe.
 */
export function subscribeHeroAlignment(
  cb: (alignment: HeroAlignmentSignal | null) => void,
): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {};
  }
  cb(readHeroAlignment());
  const observer = new MutationObserver(() => cb(readHeroAlignment()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [ATTR],
  });
  return () => observer.disconnect();
}
