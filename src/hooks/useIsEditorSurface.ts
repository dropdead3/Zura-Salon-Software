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
 * Path-based: any URL beginning with `/dashboard` is treated as an editor
 * surface. The iframe preview lives at `/org/<slug>/...?preview=true` and
 * is detected by `useIsEditorPreview` instead — the two hooks compose
 * (either flag flips the read into draft mode).
 */
export function useIsEditorSurface(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/dashboard');
}
