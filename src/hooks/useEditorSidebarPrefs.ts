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
 * The `orgId` argument is currently unused but retained on the hook
 * signature so callers don't need to churn if we later reintroduce
 * per-org defaults (e.g. surfacing whichever group the operator most
 * recently edited inside this session).
 */

// Default: only the highest-leverage group ('Above the Fold') is open.
// Keeps the rail to ~5 visible rows by default.
const DEFAULT_COLLAPSED_GROUPS = [
  'Social Proof',
  'Services & Portfolio',
  'Conversion',
  'Team & Extras',
];

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

  return { isCollapsed, toggleGroup };
}
