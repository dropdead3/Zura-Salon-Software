

## Replace Progress Bars with Ranked List for Staff Breakdown

### Problem
When 20+ staff members are shown with linear progress bars, the top earner dominates and the bottom 80% appear as invisible slivers. The visual adds no information.

### Solution
Replace the progress bar column with a **rank number** column. The layout becomes a clean 4-column grid: rank, name, share %, and dollar amount. No bars — the numbers communicate the hierarchy directly.

### Changes

**File: `src/components/dashboard/sales/CategoryBreakdownPanel.tsx`**

Only apply the ranked-list treatment when `breakdownType === 'stylist'`; keep bars for `category` and `location` where the distribution is typically more even.

1. Change the grid from `grid-cols-[140px_1fr_48px_90px]` to a conditional layout:
   - **Stylist mode**: `grid-cols-[28px_1fr_48px_90px]` — rank number, name, share %, value
   - **Category/Location mode**: keep current 4-column bar layout unchanged

2. For stylist rows, replace the progress bar `<div>` with a rank number:
   ```tsx
   <span className="text-xs text-muted-foreground tabular-nums text-center">
     {index + 1}
   </span>
   ```

3. The name column becomes `1fr` (fills available space), keeping `truncate` and `font-medium`.

4. Share % and value columns remain identical.

### Visual result
```text
 1   Staff Alice Johnson        13%   $2,250
 2   Staff Maria Garcia         10%   $1,833
 3   Staff Jordan Lee           10%   $1,725
...
22   Staff Kim Park              1%     $160
```

### What stays the same
- Category and Location breakdowns keep progress bars (they have fewer, more balanced entries)
- Animation, hover states, BlurredAmount wrapping, section header
- Mode toggling (revenue / dailyAvg / count)

### Files modified
- `src/components/dashboard/sales/CategoryBreakdownPanel.tsx`

