

# Fix: Sidebar Navigation Breaks on Stylist Levels Page

## Root Cause

**Infinite render loop** caused by a `useEffect` with no dependency array in `StylistLevelsEditor.tsx` (line 1734-1738):

```typescript
useEffect(() => {
  if (embedded && onActions) {
    onActions(actionButtons);  // calls setCategoryActions in Settings.tsx
  }
});  // ← NO dependency array = runs EVERY render
```

This triggers: Editor renders → calls `setCategoryActions` → Settings re-renders → Editor re-renders → calls `setCategoryActions` again → ∞ loop. The rapid DOM thrashing detaches sidebar nodes, making all navigation links unclickable.

## Fix (1 file)

**`src/components/dashboard/settings/StylistLevelsEditor.tsx`**

1. **Memoize `actionButtons`** using `useMemo` — the JSX depends on `hasChanges`, `saveLevels.isPending`, `analysisLoading`, `showRoadmap`, and handler functions.

2. **Add a dependency array** to the `useEffect` at line 1734 so it only fires when `actionButtons` actually changes:

```typescript
const actionButtons = useMemo(() => (
  <div className="flex items-center gap-2">
    {/* existing button JSX */}
  </div>
), [hasChanges, saveLevels.isPending, analysisLoading, showRoadmap]);

useEffect(() => {
  if (embedded && onActions) {
    onActions(actionButtons);
  }
}, [embedded, onActions, actionButtons]);
```

This breaks the infinite loop by ensuring `onActions` is only called when the button state genuinely changes.

## Scope

- Single file edit: `StylistLevelsEditor.tsx`
- No database or migration changes
- No other components affected

