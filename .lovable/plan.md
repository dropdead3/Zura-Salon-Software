

# Persist Column Selections in Supply Library Dialog

## What
Save `selectedCategory` and `selectedLine` to localStorage when a brand is open, and restore them when re-opening that brand. Follows the same org+brand-scoped key pattern used in `SupplyLibraryTab`.

## Changes — `SupplyLibraryDialog.tsx`

### 1. Add localStorage key helper
```ts
const columnKey = useCallback(
  (col: 'cat' | 'line', brand: string) =>
    `supply-dialog-${col}::${orgId}::${brand}`,
  [orgId],
);
```

### 2. Persist on change
Two `useEffect`s — when `selectedCategory` or `selectedLine` changes (and `selectedBrand` is set), write to localStorage. Remove keys when values are null.

### 3. Restore on brand select
In the `onSelectBrand` handler (line ~585), after setting `selectedBrand`, read from localStorage and call `setSelectedCategory` / `setSelectedLine` with saved values (or null).

### 4. Prune keys
Reuse the same pruning pattern from `SupplyLibraryTab` — if keys starting with `supply-dialog-` exceed 500, remove those not matching the current org+brand.

### 5. Clear on back
`handleBack` already sets both to null — no change needed there since we only persist when `selectedBrand` is truthy.

