

## Bug Fix: Editor Reload + Sidebar Collapse on Section Click

Two root causes identified, both in the editor's state management.

### Bug 1: Collapsed State Never Restored from localStorage

**File:** `src/hooks/useEditorLayout.ts`, lines 47-52

The `loadPrefs()` function **hardcodes** `structureCollapsed: false` and `inspectorCollapsed: false` — it never reads the saved values from localStorage, even though `savePrefs` writes them correctly. This means:

- User collapses a panel → saved to localStorage as `true`
- Component re-initializes → `loadPrefs()` returns `false` (ignoring stored value)
- Visual state and logical state become desynchronized
- Clicking "expand" toggles `false → true`, which collapses instead of expanding — hence "won't expand"

**Fix:** Read `parsed.structureCollapsed` and `parsed.inspectorCollapsed` from the stored JSON instead of hardcoding `false`.

### Bug 2: `setSearchParams` in useEffect Triggers Unnecessary Navigation

**File:** `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`, lines 266-268

```tsx
useEffect(() => {
  setSearchParams({ tab: activeTab }, { replace: true });
}, [activeTab, setSearchParams]);
```

Every tab change triggers `setSearchParams`, which performs a React Router navigation (even with `replace: true`). This can cause the `ProtectedRoute` wrapper to briefly re-evaluate its permission hooks, potentially triggering a loading state that unmounts and remounts the editor — which resets `useEditorLayout` and calls the broken `loadPrefs()`.

**Fix:** Remove this `useEffect` entirely. Instead, update the URL directly inside `handleTabChange` and `setActiveTab` calls. This eliminates the navigation side-effect from the render cycle.

### Changes

| File | Change |
|------|--------|
| `src/hooks/useEditorLayout.ts` | Fix `loadPrefs()` to read `structureCollapsed` and `inspectorCollapsed` from stored JSON |
| `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` | Remove `useEffect` that syncs `activeTab` → search params; move URL update into `handleTabChange` callback |

### Technical Detail

```text
loadPrefs() currently:
  parsed.structureWidth  ──→ ✓ restored
  parsed.inspectorWidth  ──→ ✓ restored
  parsed.structureCollapsed ──→ ✗ hardcoded false
  parsed.inspectorCollapsed ──→ ✗ hardcoded false

loadPrefs() fixed:
  parsed.structureCollapsed ──→ ✓ restored (defaults to false if missing)
  parsed.inspectorCollapsed ──→ ✓ restored (defaults to false if missing)
```

