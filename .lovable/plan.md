

## Fix Progress Bar — Clear Visual State

### Problem
The bar looks full at 60% because each segment's **outer container** has a colored background (`bg-primary`, `bg-primary/60`, or `bg-muted-foreground/20`), making incomplete segments appear filled. The visual distinction between complete, partial, and empty is too subtle.

### Solution
Replace the confusing nested-segment approach with a **single continuous bar** that fills to the actual overall percentage, plus add visual separators between segments so users can see where each milestone's portion starts/ends.

### Changes — `ServiceTrackingProgressBar.tsx`

1. **Single fill bar**: Render one `<div>` inside the track, width = `overallPct%`, colored `bg-primary`. This immediately makes 60% look like 60%.

2. **Segment dividers**: Overlay thin vertical lines at each segment boundary (cumulative `m.total / overallTotal` positions) so users can still see the 4 milestone regions.

3. **Color-coded fill segments**: Instead of one flat fill, render each milestone's filled portion sequentially (complete = `bg-primary`, partial = `bg-amber-500`, empty = transparent). No outer background color — the track's `bg-muted` shows through for unfilled areas.

4. **Enhanced percentage label**: Make the percentage more prominent with slightly larger text and color that reflects status (muted when low, primary when high, success when 100%).

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingProgressBar.tsx`

