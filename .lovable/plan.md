

## Clean up Sales Overview card corner elements

Looking at the screenshot, there are two visual issues:

### Issue 1: Trend indicator (-100.0%) stuck in bottom-left
The `SalesTrendIndicator` is a `flex` element inside a `text-center` parent. `text-center` only affects inline/text children, not flex containers -- so the trend renders left-aligned while everything else is centered.

**Fix** (`AggregateSalesCard.tsx`, line 792): Change the wrapper `<div className="mt-2">` to `<div className="mt-2 flex justify-center">` so the trend indicator centers with the rest of the hero content.

### Issue 2: Top-right sync status refinement
The absolute-positioned "No POS sales recorded yet today" and sync indicator work but could use slightly better spacing and opacity treatment for a calmer look.

**Fix** (`AggregateSalesCard.tsx`, lines 616-619): Adjust to `gap-1` for breathing room and use `text-muted-foreground/60` on the label for softer presence.

### Files changed
- `src/components/dashboard/AggregateSalesCard.tsx` (2 small edits)

