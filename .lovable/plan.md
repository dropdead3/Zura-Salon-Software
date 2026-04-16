

# Minimum Column Width with Horizontal Scroll in DayView

## Problem
With 12+ stylists visible, columns compress to unusable widths (screenshot shows ~100px per column). Client names, service names, and time ranges all truncate severely. The layout should enforce a minimum column width and allow horizontal scrolling when stylists exceed available space.

## Approach
Set a minimum column width (120px) on both header cells and grid columns. The outer container switches from `overflow-x-hidden` to `overflow-x-auto`. The header and grid share the same computed `min-width` so they scroll in sync. The `columnWidth` measurement and `useShortLabels` logic remain unchanged — they'll naturally read 120px+ now instead of being squeezed.

## Changes

### 1. `DayView.tsx` — Add minimum column width and horizontal scroll

**Constants:** Add `const MIN_COL_WIDTH = 120;` near the top.

**Outer scroll container (line 645):** Change `overflow-x-hidden` → `overflow-x-auto` to enable horizontal scrolling.

**Compute grid min-width:** Add a derived value:
```ts
const gridMinWidth = 70 + sortedStylists.length * MIN_COL_WIDTH;
```

**Inner wrapper (line 646):** Add `style={{ minWidth: gridMinWidth }}` so the content forces scroll when needed.

**Header row columns (lines 715, 736):** Replace `min-w-0` with `min-w-[120px]` on each stylist header cell (both condensed and normal variants).

**Grid columns (line 786):** Replace `min-w-0` with `min-w-[120px]` on each stylist column in the time grid.

**columnWidth measurement (line 530-532):** Clamp to minimum:
```ts
const colWidth = Math.max(containerWidth / count, MIN_COL_WIDTH);
```

This ensures `useShortLabels` and condensed layout logic still triggers correctly based on actual rendered width.

### Files Modified
1. `src/components/dashboard/schedule/DayView.tsx` — min column width, horizontal scroll, clamped measurement

