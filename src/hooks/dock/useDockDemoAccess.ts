/**
 * Returns true when the Dock demo bypass should be visible.
 * True in: local dev, Lovable preview/editor contexts.
 * False in: published production builds.
 */
export function useDockDemoAccess(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  if (params.has('preview') || params.has('mode')) return true;

  const host = window.location.hostname;
  if (host.includes('lovable.app') || host.includes('lovableproject.com')) return true;

  return false;
}
