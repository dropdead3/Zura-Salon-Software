import { useCallback, useEffect, useState } from 'react';

/**
 * Persisted preferences for the website editor's left rail.
 *
 * UI state only — not site content — so it lives in localStorage
 * scoped per org. Rationale: it shouldn't ride the draft/publish
 * pipeline used for actual site_settings.
 */

interface SidebarPrefs {
  collapsedGroups: string[];
}

const STORAGE_PREFIX = 'zura.editor.sidebar.prefs';

// Default: only the highest-leverage groups are open.
// Keeps the rail to ~5 visible rows by default.
const DEFAULT_COLLAPSED_GROUPS = [
  'Social Proof',
  'Services & Portfolio',
  'Conversion',
  'Team & Extras',
];

function storageKey(orgId: string | null | undefined): string {
  return `${STORAGE_PREFIX}.${orgId ?? 'anon'}`;
}

function readPrefs(orgId: string | null | undefined): SidebarPrefs {
  if (typeof window === 'undefined') {
    return { collapsedGroups: DEFAULT_COLLAPSED_GROUPS };
  }
  try {
    const raw = window.localStorage.getItem(storageKey(orgId));
    if (!raw) return { collapsedGroups: DEFAULT_COLLAPSED_GROUPS };
    const parsed = JSON.parse(raw) as Partial<SidebarPrefs>;
    return {
      collapsedGroups: Array.isArray(parsed.collapsedGroups)
        ? parsed.collapsedGroups
        : DEFAULT_COLLAPSED_GROUPS,
    };
  } catch {
    return { collapsedGroups: DEFAULT_COLLAPSED_GROUPS };
  }
}

function writePrefs(orgId: string | null | undefined, prefs: SidebarPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(orgId), JSON.stringify(prefs));
  } catch {
    // Quota or unavailable — silently degrade.
  }
}

export function useEditorSidebarPrefs(orgId: string | null | undefined) {
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>(
    () => readPrefs(orgId).collapsedGroups,
  );

  // Reload when org changes (preserves per-tenant preference).
  useEffect(() => {
    setCollapsedGroups(readPrefs(orgId).collapsedGroups);
  }, [orgId]);

  const isCollapsed = useCallback(
    (groupTitle: string) => collapsedGroups.includes(groupTitle),
    [collapsedGroups],
  );

  const toggleGroup = useCallback(
    (groupTitle: string) => {
      setCollapsedGroups((prev) => {
        const next = prev.includes(groupTitle)
          ? prev.filter((g) => g !== groupTitle)
          : [...prev, groupTitle];
        writePrefs(orgId, { collapsedGroups: next });
        return next;
      });
    },
    [orgId],
  );

  return { isCollapsed, toggleGroup };
}
