

# Enhance localStorage Keys: Cleanup, Reset Button, and Org-scoped Prefix

Three small changes, all in `SupplyLibraryTab.tsx`.

## 1. Org-scoped localStorage keys

Import `useBackroomOrgId` and prefix all keys with the resolved org ID:

```
supply-library-categories::${orgId}::${brand}
supply-library-sublines::${orgId}::${brand}
```

This isolates collapse state for multi-org users sharing a browser. Falls back to `_` if no org ID is available.

**Touches:** Import line, key construction in persistence effects (lines 70-77), brand click handler (line 664), and the "Collapse All / Expand All" button logic.

## 2. Legacy key cleanup

Add a one-time `useEffect` that removes the old global keys (`supply-library-categories`, `supply-library-sublines`) from `localStorage` on mount. Use a sentinel key (`supply-library-migrated`) to run only once.

## 3. "Reset All Collapse State" button

Add a small ghost button (with an `X` or `RotateCcw` icon) in the brand detail toolbar, next to the existing "Collapse All / Expand All" toggle. On click, iterate `localStorage` keys matching the `supply-library-categories::` and `supply-library-sublines::` prefixes, remove them all, and reset both state sets to empty. Show a toast confirming the reset.

### Files modified
- `src/components/platform/backroom/SupplyLibraryTab.tsx` — all three changes

