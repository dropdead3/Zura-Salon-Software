/**
 * Detects if the caller is rendering inside an editor surface
 * (dashboard route tree) as opposed to the public site or its iframe preview.
 *
 * Why this exists
 * ───────────────
 * Editor hooks (e.g. `usePromotionalPopup` consumed by the editor's form)
 * must read the **draft** copy so the form/toggle state matches what the
 * adjacent live-preview iframe is rendering. Without this, the editor
 * reads `live` while the iframe reads `draft`, producing a confusing
 * desync: the operator sees the toggle as OFF (live=disabled) yet the
 * preview shows the popup (draft=enabled, queued for publish).
 *
 * Detection
 * ─────────
 * Path-based: any URL containing `/dashboard` is treated as an editor
 * surface. This catches BOTH legacy `/dashboard/*` and the canonical
 * multi-tenant `/org/:slug/dashboard/*` shape — the latter is the URL
 * the user is actually on most of the time. Using `includes` (not
 * `startsWith`) avoids the slug-prefix trap that bit the hero
 * background editor (draft URL was empty in the upload tile because
 * the surface was misclassified as public, so it read live `value`).
 *
 * The iframe preview lives at `/org/<slug>/...?preview=true` and is
 * detected by `useIsEditorPreview` instead — the two hooks compose via
 * `useIsDraftReader` (either flag flips the read into draft mode).
 */
export function useIsEditorSurface(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.includes('/dashboard');
}
