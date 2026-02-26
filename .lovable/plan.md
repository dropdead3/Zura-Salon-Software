

## Fix: Editor Sidebars Always Start Expanded + Toggle Actually Works

### Root Cause Analysis

**Two interconnected bugs:**

1. **Stale localStorage**: Previous sessions save `structureCollapsed: true` or `inspectorCollapsed: true`. On reload, `loadPrefs()` reads these values, so panels start collapsed despite the user expectation of "always expanded on load."

2. **Toggle defeated by space-check**: When clicking "Expand" on the collapsed rail, `toggleStructure` flips `structureCollapsed` from `true` to `false`. But the space-check logic (lines 132-141) immediately re-evaluates and can set `structureVisible = false` again if `prefs.inspectorCollapsed === undefined`. The toggle "works" in state but the computed visibility overrides it.

### Fix

#### File: `src/hooks/useEditorLayout.ts`

**Change 1 — Always start expanded on mount.** Do not read `structureCollapsed` or `inspectorCollapsed` from localStorage. Only persist/restore panel widths. This matches the user's explicit preference: "Always force expanded."

```tsx
// loadPrefs: only restore widths, never collapse state
function loadPrefs(): PersistedLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Only restore width preferences, not collapse state
      return {
        structureWidth: parsed.structureWidth,
        inspectorWidth: parsed.inspectorWidth,
        structureCollapsed: false,
        inspectorCollapsed: false,
      };
    }
    return {};
  } catch {
    return {};
  }
}
```

**Change 2 — Fix toggle to use explicit booleans.** The current toggle `!prev.structureCollapsed` is ambiguous when the value is `undefined` (`!undefined = true` → collapses instead of expanding). Use explicit boolean flipping:

```tsx
const toggleStructure = useCallback(() => {
  setPrefs((prev) => {
    const next = { ...prev, structureCollapsed: prev.structureCollapsed === true ? false : true };
    savePrefs(next);
    return next;
  });
}, []);

const toggleInspector = useCallback(() => {
  setPrefs((prev) => {
    const next = { ...prev, inspectorCollapsed: prev.inspectorCollapsed === true ? false : true };
    savePrefs(next);
    return next;
  });
}, []);
```

**Change 3 — Space-check should not silently override explicit user toggles.** Currently, the space check collapses panels when `prefs.inspectorCollapsed === undefined`. After the fix, prefs will always be explicit booleans (`true`/`false`), so the `=== undefined` check will never match, which means the space check won't override user intent. This is the correct behavior — if the user explicitly expands a panel, it stays expanded even if space is tight.

### Files

| File | Change |
|---|---|
| `src/hooks/useEditorLayout.ts` | Always init collapse state as `false`, fix toggle to use explicit booleans |

One file. Three targeted changes.

