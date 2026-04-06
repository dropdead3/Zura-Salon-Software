

# Fix Sticky Table Visual Issues — Clean Edges, Backgrounds, and Borders

## Problems Identified

From the screenshot, several visual issues are visible:

1. **Sticky header cells lack consistent backgrounds** — when scrolling vertically, content bleeds through behind the sticky header row because some cells use `bg-card` while the outer container also has `bg-card`, but the `rounded-tl-xl` on the first header cell creates a visible corner artifact against the scroll content.

2. **Sticky left column cells have mismatched backgrounds** — the section header rows (`Compensation`, `Promotion`, `Retention`) use `bg-muted/50` but their sticky left cell doesn't carry that background, causing a visual gap when scrolling horizontally.

3. **Corner radius on inner table cells is incorrect** — the `rounded-tl-xl` on the Metric header cell creates a visible rounded corner inside the table that doesn't align with the outer container's border radius. The outer `ScrollableTableWrapper` already has `rounded-xl`, so inner cells should have no border radius.

4. **Section header rows are not sticky-left aware** — the `colSpan` cells for section headers (Compensation, Promotion, Retention) don't have sticky left positioning, so they scroll away horizontally.

5. **Editing row background (`bg-primary/5`) on sticky cells** doesn't extend properly — the sticky metric cell background should match the row background during scroll.

## Changes in `StylistLevelsEditor.tsx`

### 1. Remove `rounded-tl-xl` from the Metric header cell (~line 698)
The outer container already provides the rounded corners. Inner cells should be square.

### 2. Ensure section header rows have sticky-left first cell
Split the `colSpan` section headers into a sticky left cell + a regular spanning cell so the section label stays visible during horizontal scroll:
```tsx
// Instead of one colSpan cell:
<TableCell className="sticky left-0 z-10 bg-muted/50 py-4 px-4 border-l-2 border-l-primary border-r border-border/40">
  <span>...</span>
</TableCell>
<TableCell colSpan={levels.length} className="py-4 px-4 bg-muted/50" />
```

### 3. Ensure all sticky-left cells use `bg-card` (or contextual bg) consistently
- Metric header: `bg-card` (already present, keep)
- Commission/Wage rows: `bg-card` (already present, keep)
- Section headers: `bg-muted/50` on sticky cell
- Editing rows: `bg-primary/5` on sticky cell (already present)

### 4. Add bottom border to header row for clean separation
Ensure the sticky header has a solid bottom border (`border-b-2 border-border/60`) so it visually separates from content underneath during vertical scroll. Already present on `TableRow`, verify it renders.

### 5. Clean up z-index layering
- Metric header (sticky left + top): `z-30` — correct
- Level headers (sticky top only): keep inheriting from parent `z-20`
- Metric column cells (sticky left only): `z-10` — correct

## Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — remove inner border-radius, split section header rows for sticky-left support, ensure consistent backgrounds

## No database changes.

