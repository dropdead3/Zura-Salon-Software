import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorSidebarPrefs } from './useEditorSidebarPrefs';

/**
 * Editor entry contract: section-group expand/collapse is session-only.
 * Even if a stale localStorage entry exists from a prior implementation,
 * the rail must boot from the default tree on every mount.
 *
 * Default policy (May 2026): all groups expanded on entry. Operators can
 * collapse individually via the chevron, or in bulk via the Collapse-All
 * affordance; closing & reopening the editor returns to the all-expanded
 * default.
 */
describe('useEditorSidebarPrefs', () => {
  const ALL_GROUPS = [
    'Above the Fold',
    'Social Proof',
    'Services & Portfolio',
    'Conversion',
    'Team & Extras',
  ];

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('seeds with every group expanded regardless of stale localStorage', () => {
    // Old persisted shape — should be ignored entirely.
    window.localStorage.setItem(
      'zura.editor.sidebar.prefs.org-1',
      JSON.stringify({ collapsedGroups: ['Social Proof'] }),
    );

    const { result } = renderHook(() => useEditorSidebarPrefs('org-1'));

    for (const title of ALL_GROUPS) {
      expect(result.current.isCollapsed(title)).toBe(false);
    }
    expect(result.current.hasAnyCollapsed).toBe(false);
  });

  it('toggleGroup flips state in-session', () => {
    const { result } = renderHook(() => useEditorSidebarPrefs('org-1'));

    expect(result.current.isCollapsed('Social Proof')).toBe(false);
    act(() => result.current.toggleGroup('Social Proof'));
    expect(result.current.isCollapsed('Social Proof')).toBe(true);
    expect(result.current.hasAnyCollapsed).toBe(true);

    act(() => result.current.toggleGroup('Social Proof'));
    expect(result.current.isCollapsed('Social Proof')).toBe(false);
    expect(result.current.hasAnyCollapsed).toBe(false);
  });

  it('collapseAll collapses every passed-in group title', () => {
    const { result } = renderHook(() => useEditorSidebarPrefs('org-1'));
    act(() => result.current.collapseAll(ALL_GROUPS));
    for (const title of ALL_GROUPS) {
      expect(result.current.isCollapsed(title)).toBe(true);
    }
    expect(result.current.hasAnyCollapsed).toBe(true);
  });

  it('expandAll clears all collapsed state', () => {
    const { result } = renderHook(() => useEditorSidebarPrefs('org-1'));
    act(() => result.current.collapseAll(ALL_GROUPS));
    act(() => result.current.expandAll());
    for (const title of ALL_GROUPS) {
      expect(result.current.isCollapsed(title)).toBe(false);
    }
    expect(result.current.hasAnyCollapsed).toBe(false);
  });

  it('does NOT write to localStorage on toggle / collapseAll / expandAll', () => {
    const { result } = renderHook(() => useEditorSidebarPrefs('org-1'));
    act(() => result.current.toggleGroup('Above the Fold'));
    act(() => result.current.collapseAll(ALL_GROUPS));
    act(() => result.current.expandAll());

    const keys = Object.keys(window.localStorage).filter((k) =>
      k.startsWith('zura.editor.sidebar.prefs'),
    );
    expect(keys).toEqual([]);
  });

  it('remounting resets to defaults (closing & reopening the editor)', () => {
    const { result, unmount } = renderHook(() => useEditorSidebarPrefs('org-1'));
    act(() => result.current.collapseAll(ALL_GROUPS));
    expect(result.current.hasAnyCollapsed).toBe(true);
    unmount();

    const { result: next } = renderHook(() => useEditorSidebarPrefs('org-1'));
    expect(next.current.hasAnyCollapsed).toBe(false);
  });

  it('re-seeds when orgId changes', () => {
    const { result, rerender } = renderHook(
      ({ orgId }: { orgId: string }) => useEditorSidebarPrefs(orgId),
      { initialProps: { orgId: 'org-1' } },
    );
    act(() => result.current.collapseAll(ALL_GROUPS));
    expect(result.current.hasAnyCollapsed).toBe(true);

    rerender({ orgId: 'org-2' });
    expect(result.current.hasAnyCollapsed).toBe(false);
  });
});
