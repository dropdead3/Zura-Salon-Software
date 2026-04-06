

# Make Header Row Sticky for Vertical Scrolling

## Problem

When scrolling vertically through the criteria table, the header row (Level 1, Level 2, etc.) scrolls away, making it hard to know which column belongs to which level.

## Solution

Make the `TableHeader` row sticky at the top of the scroll container so it remains visible during vertical scroll.

### Changes in `StylistLevelsEditor.tsx`

1. **`TableHeader`** (~line 696): Add `sticky top-0 z-30` so the entire header row pins to the top of the overflow container.

2. **`TableRow` inside header** (~line 697): Ensure the row has a solid `bg-card` background so it doesn't show content bleeding through underneath.

3. **All `TableHead` cells** (~line 698, 703): Ensure each header cell has `bg-card` so the sticky row is fully opaque. The "Metric" cell already has `bg-card`; the level columns need it added.

4. **Z-index coordination**: The "Metric" header cell (sticky both left and top) needs the highest z-index (`z-30`) since it's frozen in both directions. Level header cells get `z-20` (sticky top only).

```tsx
// TableHeader
<TableHeader className="sticky top-0 z-20">
  <TableRow className="border-b-2 border-border/60 bg-card">
    {/* Metric cell: sticky left + top → z-30 */}
    <TableHead className="... sticky left-0 bg-card z-30 ...">Metric</TableHead>
    {/* Level cells: sticky top via parent → z-20, need bg-card */}
    <TableHead className="... bg-card ...">...</TableHead>
  </TableRow>
</TableHeader>
```

### Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — 3 small class additions

### No database changes.

