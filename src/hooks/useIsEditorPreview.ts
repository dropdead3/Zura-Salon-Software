/**
 * Detects if the app is rendered inside the Website Editor iframe.
 *
 * Trusted query params (only these route reads to draft mode):
 *   - `?preview=true`
 *   - `?mode=view` or `?mode=edit`
 *
 * Anything else (e.g. `?mode=share`) is treated as a public visitor so a
 * shared public URL never accidentally exposes unpublished drafts.
 */
const EDITOR_PREVIEW_MODES = new Set(['view', 'edit']);

export function useIsEditorPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') === 'true') return true;
  const mode = params.get('mode');
  return !!mode && EDITOR_PREVIEW_MODES.has(mode);
}
