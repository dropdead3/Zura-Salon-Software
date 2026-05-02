import { useCallback, useEffect, useState } from 'react';

/**
 * Per-session preferences for the website editor's left rail.
 *
 * Section-group expand/collapse state is intentionally **not** persisted to
 * localStorage. Restoring it across sessions made re-entering the editor
 * feel like landing in a half-edited state instead of the canonical nav
 * tree. Within a single editor session the operator's toggles still stick;
 * closing the editor and coming back resets to the defaults below.
 *
 * Default policy: **all groups expanded** on entry. The earlier "only Above
 * the Fold open" default hid most of the rail behind chevrons and made the
 * inventory of editable sections invisible. Operators wanted a full bird's-
 * eye view by default and explicit Collapse-All / Expand-All controls when
 * the rail gets dense — that's what this hook now exposes.
 *
 * The `orgId` argument is currently unused but retained on the hook
 * signature so callers don't need to churn if we later reintroduce
 * per-org defaults (e.g. surfacing whichever group the operator most
 * recently edited inside this session).
 */

// Default: every group expanded. Empty array = nothing collapsed.
const DEFAULT_COLLAPSED_GROUPS: string[] = [];

export function useEditorSidebarPrefs(orgId: string | null | undefined) {
  void orgId; // reserved — see file header
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>(
    () => [...DEFAULT_COLLAPSED_GROUPS],
  );

  // Re-seed defaults when the org changes. Belt-and-suspenders: in practice
  // the editor remounts on org switch, but if a future caller keeps the hook
  // alive across orgs we still want a clean tree.
  useEffect(() => {
    setCollapsedGroups([...DEFAULT_COLLAPSED_GROUPS]);
  }, [orgId]);

  const isCollapsed = useCallback(
    (groupTitle: string) => collapsedGroups.includes(groupTitle),
    [collapsedGroups],
  );

  const toggleGroup = useCallback((groupTitle: string) => {
    setCollapsedGroups((prev) =>
      prev.includes(groupTitle)
        ? prev.filter((g) => g !== groupTitle)
        : [...prev, groupTitle],
    );
  }, []);

  /**
   * Collapse every group the caller knows about. Caller passes the full
   * list of group titles currently rendered (the hook is title-agnostic;
   * SECTION_GROUPS lives in the sidebar, not here, so we don't hardcode it).
   */
  const collapseAll = useCallback((groupTitles: string[]) => {
    setCollapsedGroups([...groupTitles]);
  }, []);

  /** Expand every group — clears the collapsed set. */
  const expandAll = useCallback(() => {
    setCollapsedGroups([]);
  }, []);

  /** True when at least one group is collapsed (drives Expand-All affordance). */
  const hasAnyCollapsed = collapsedGroups.length > 0;

  return { isCollapsed, toggleGroup, collapseAll, expandAll, hasAnyCollapsed };
}
