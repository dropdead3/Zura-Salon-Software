/**
 * Detects if the app is rendered inside the Website Editor iframe.
 * Evaluates at call-time (not module-level) so it works with late-loaded iframes.
 */
export function useIsEditorPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('preview') || params.has('mode');
}
