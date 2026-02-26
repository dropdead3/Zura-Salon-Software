/**
 * EDITOR LAYOUT MANAGER
 *
 * Responsive layout state machine for the three-panel Website Editor.
 * Reads container width via ResizeObserver, computes panel visibility
 * deterministically, and persists user preferences to localStorage.
 *
 * Collapse priority: inspector first, then structure.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Constants ───
const STRUCTURE_MIN = 260;
const STRUCTURE_MAX = 320;
const INSPECTOR_MIN = 320;
const INSPECTOR_MAX = 380;
const CANVAS_MIN = 480;
const GUTTERS_AND_PADDING = 48; // 3 gaps × 12px + 2 × 12px outer padding (approx)

const STORAGE_KEY = 'editor-panel-layout';

// ─── Breakpoints ───
type EditorBreakpoint = 'wide' | 'standard' | 'compact' | 'tablet' | 'mobile';

function getBreakpoint(width: number): EditorBreakpoint {
  if (width >= 1440) return 'wide';
  if (width >= 1200) return 'standard';
  if (width >= 1024) return 'compact';
  if (width >= 768) return 'tablet';
  return 'mobile';
}

// ─── Persisted prefs ───
interface PersistedLayout {
  structureCollapsed?: boolean;
  inspectorCollapsed?: boolean;
  structureWidth?: number;
  inspectorWidth?: number;
}

function loadPrefs(): PersistedLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs: PersistedLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

// ─── Return type ───
export interface EditorLayoutState {
  breakpoint: EditorBreakpoint;
  structureVisible: boolean;
  inspectorVisible: boolean;
  structureWidth: number;
  inspectorWidth: number;
  isMobile: boolean;
  isTablet: boolean;
  isCompact: boolean;
  toggleStructure: () => void;
  toggleInspector: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useEditorLayout(): EditorLayoutState {
  const containerRef = useRef<HTMLDivElement>(null!);
  const [containerWidth, setContainerWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [prefs, setPrefs] = useState<PersistedLayout>(loadPrefs);

  // ─── Observe container width ───
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      // Fallback to window
      const onResize = () => setContainerWidth(window.innerWidth);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const breakpoint = getBreakpoint(containerWidth);
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isCompact = breakpoint === 'compact';

  // ─── Compute ideal widths for breakpoint ───
  const idealStructureWidth =
    breakpoint === 'wide'
      ? Math.min(prefs.structureWidth ?? 300, STRUCTURE_MAX)
      : breakpoint === 'standard'
        ? Math.min(prefs.structureWidth ?? 270, 280)
        : STRUCTURE_MIN;

  const idealInspectorWidth =
    breakpoint === 'wide'
      ? Math.min(prefs.inspectorWidth ?? 360, INSPECTOR_MAX)
      : breakpoint === 'standard'
        ? Math.min(prefs.inspectorWidth ?? 330, 340)
        : INSPECTOR_MIN;

  // ─── Auto-collapse logic ───
  // Default to expanded when user has no stored preference
  const userWantsStructureCollapsed = prefs.structureCollapsed === true;
  const userWantsInspectorCollapsed = prefs.inspectorCollapsed === true;

  let structureVisible = !isMobile && !isTablet && !userWantsStructureCollapsed;
  let inspectorVisible = !isMobile && !isTablet && !userWantsInspectorCollapsed;

  // Space check: only auto-collapse if user hasn't explicitly set the pref
  const spaceWithBoth =
    containerWidth - GUTTERS_AND_PADDING - idealStructureWidth - idealInspectorWidth;
  const spaceWithStructureOnly =
    containerWidth - GUTTERS_AND_PADDING - idealStructureWidth;

  if (structureVisible && inspectorVisible && spaceWithBoth < CANVAS_MIN) {
    if (prefs.inspectorCollapsed === undefined) {
      inspectorVisible = false;
    }
  }
  if (structureVisible && !inspectorVisible && spaceWithStructureOnly < CANVAS_MIN) {
    if (prefs.structureCollapsed === undefined) {
      structureVisible = false;
    }
  }

  // ─── Final widths ───
  const structureWidth = structureVisible
    ? Math.max(STRUCTURE_MIN, Math.min(idealStructureWidth, STRUCTURE_MAX))
    : 0;
  const inspectorWidth = inspectorVisible
    ? Math.max(INSPECTOR_MIN, Math.min(idealInspectorWidth, INSPECTOR_MAX))
    : 0;

  // ─── Toggles ───
  const toggleStructure = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, structureCollapsed: !prev.structureCollapsed };
      savePrefs(next);
      return next;
    });
  }, []);

  const toggleInspector = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, inspectorCollapsed: !prev.inspectorCollapsed };
      savePrefs(next);
      return next;
    });
  }, []);

  return {
    breakpoint,
    structureVisible,
    inspectorVisible,
    structureWidth,
    inspectorWidth,
    isMobile,
    isTablet,
    isCompact,
    toggleStructure,
    toggleInspector,
    containerRef,
  };
}
