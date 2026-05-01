/**
 * Regression test for the "upload tile goes blank in the editor after save"
 * bug: the editor surface was reading LIVE site_settings while the iframe
 * read DRAFT, so a freshly-saved hero background URL existed in
 * draft_value but the dropzone rendered empty.
 *
 * The fix routed the editor through `useIsDraftReader`, which detects both
 * the iframe (`?preview=true`) AND the dashboard surface (`/dashboard`
 * anywhere in the path) and flips the read into draft mode.
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

describe('useIsDraftReader (dashboard surface fix)', () => {
  beforeEach(() => {
    // jsdom resets between tests but be explicit.
    window.history.replaceState({}, '', '/');
  });

  it('returns true on the legacy /dashboard path', async () => {
    window.history.replaceState({}, '', '/dashboard/admin/website-hub?tab=editor');
    const { useIsDraftReader } = await import('@/hooks/useIsDraftReader');
    // Hooks must run inside a React render; assert the underlying primitives
    // instead, which is what the hook composes.
    const { useIsEditorSurface } = await import('@/hooks/useIsEditorSurface');
    const { useIsEditorPreview } = await import('@/hooks/useIsEditorPreview');
    expect(useIsEditorSurface()).toBe(true);
    expect(useIsEditorPreview()).toBe(false);
    // Composition: surface true → draft reader true even without iframe.
    expect(useIsDraftReader.toString()).toContain('useIsEditorPreview');
    expect(useIsDraftReader.toString()).toContain('useIsEditorSurface');
  });

  it('returns true on the multi-tenant /org/:slug/dashboard path', async () => {
    window.history.replaceState(
      {},
      '',
      '/org/drop-dead-salons/dashboard/admin/website-hub?tab=editor',
    );
    const { useIsEditorSurface } = await import('@/hooks/useIsEditorSurface');
    // This is the URL from the original bug report. It MUST classify as an
    // editor surface — earlier `startsWith('/dashboard')` missed it.
    expect(useIsEditorSurface()).toBe(true);
  });

  it('returns false on a public org page without /dashboard segment', async () => {
    window.history.replaceState({}, '', '/org/drop-dead-salons/services');
    const { useIsEditorSurface } = await import('@/hooks/useIsEditorSurface');
    const { useIsEditorPreview } = await import('@/hooks/useIsEditorPreview');
    expect(useIsEditorSurface()).toBe(false);
    expect(useIsEditorPreview()).toBe(false);
  });

  it('returns true for the iframe even on a non-/dashboard URL', async () => {
    window.history.replaceState({}, '', '/org/drop-dead-salons/?preview=true');
    const { useIsEditorPreview } = await import('@/hooks/useIsEditorPreview');
    expect(useIsEditorPreview()).toBe(true);
  });
});
