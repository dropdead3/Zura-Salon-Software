

# Fix Dead-Space Horizontal Scroll in DayView

## Problem
`gridMinWidth` is always set to `70 + sortedStylists.length * 120`, and the outer container uses `overflow-x-auto`. When all stylists fit comfortably (columns are wider than 120px), the grid content fills the viewport but `overflow-x-auto` still allows slight horizontal scrolling due to sub-pixel rounding or border widths. The user sees dead space to the right with no content.

## Fix
Only enable horizontal scrolling when the content actually needs it. Two changes:

### 1. Remove the static `minWidth` on the inner wrapper
Instead of always applying `style={{ minWidth: gridMinWidth }}`, only apply it when columns would actually be squeezed. Better approach: let CSS handle it naturally — use `min-w-0` on columns but set `min-w-[120px]` on each column cell. The grid will expand naturally via `flex` when there's room, and the `min-w-[120px]` constraint will force overflow only when needed.

The current approach double-constrains: `minWidth` on the wrapper forces a fixed total, while `min-w-[120px]` on individual cells also enforces minimums. Remove the wrapper `minWidth` — the individual cell minimums are sufficient to trigger horizontal scroll when needed.

### 2. Keep `overflow-x-auto` on the scroll container
This is correct — it only shows a scrollbar when content overflows.

### Change in `DayView.tsx`
**Line 647** — Remove the `style={{ minWidth: gridMinWidth }}` from the inner div. The `min-w-[120px]` on each column cell already handles the constraint. Without the forced wrapper width, the grid will fill available space naturally and only scroll when columns genuinely can't fit.

```tsx
// Before
<div style={{ minWidth: gridMinWidth }}>

// After  
<div>
```

The `gridMinWidth` constant and its calculation (line 522) can also be removed as dead code.

### Files Modified
1. `src/components/dashboard/schedule/DayView.tsx` — remove `gridMinWidth` wrapper style

