import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorSidebarPrefs } from './useEditorSidebarPrefs';

/**
 * Editor entry contract: section-group expand/collapse is session-only.
 * Even if a stale localStorage entry exists from a prior implementation,
 * the rail must boot from the default tree on every mount.
 */
describe('useEditorSidebarPrefs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('seeds collapsed groups from defaults regardless of stale localStorage', () => {
    // Old persisted shape — should be ignored entirely.
    window.localStorage.setItem(
      'zura.editor.sidebar.prefs.org-1',
      JSON.stringify({ collapsedGroups: [] }),
    );

    const { result } = renderHook(() => useEditorSidebarPrefs('org-1'));

    // Defaults: only "Above the Fold" is expanded; everything else collapsed.
    expect(result.current.isCollapsed('Above the Fold')).toBe(false);
    expect(result.current.isCollapsed('Social Proof')).toBe(true);
    expect(result.current.isCollapsed('Services & Portfolio')).toBe(true);
    expect(result.current.isCollapsed('Conversion')).toBe(true);
    expect(result.current.isCollapsed('Team & Extras')).toBe(true);
  });

  it('toggleGroup flips state in-session', () => {
    const { result } = renderHook(() => useEditorSidebarPrefs('org-1'));

    expect(result.current.isCollapsed('Above the Fold')).toBe(false);
    act(() => result.current.toggleGroup('Above the Fold'));
    expect(result.current.isCollapsed('Above the Fold')).toBe(true);

    expect(result.current.isCollapsed('Social Proof')).toBe(true);
    act(() => result.current.toggleGroup('Social Proof'));
    expect(result.current.isCollapsed('Social Proof')).toBe(false);
  });

  it('does NOT write to localStorage on toggle', () => {
    const { result } = renderHook(() => useEditorSidebarPrefs('org-1'));
    act(() => result.current.toggleGroup('Above the Fold'));

    // No keys with our prefix should have been written.
    const keys = Object.keys(window.localStorage).filter((k) =>
      k.startsWith('zura.editor.sidebar.prefs'),
    );
    expect(keys).toEqual([]);
  });

  it('remounting resets to defaults (closing & reopening the editor)', () => {
    const { result, unmount } = renderHook(() => useEditorSidebarPrefs('org-1'));
    act(() => result.current.toggleGroup('Social Proof')); // expand it
    expect(result.current.isCollapsed('Social Proof')).toBe(false);
    unmount();

    const { result: next } = renderHook(() => useEditorSidebarPrefs('org-1'));
    expect(next.current.isCollapsed('Social Proof')).toBe(true);
  });

  it('re-seeds when orgId changes', () => {
    const { result, rerender } = renderHook(
      ({ orgId }: { orgId: string }) => useEditorSidebarPrefs(orgId),
      { initialProps: { orgId: 'org-1' } },
    );
    act(() => result.current.toggleGroup('Conversion')); // expand it
    expect(result.current.isCollapsed('Conversion')).toBe(false);

    rerender({ orgId: 'org-2' });
    expect(result.current.isCollapsed('Conversion')).toBe(true);
  });
});
