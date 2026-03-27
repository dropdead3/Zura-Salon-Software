

# Fix: Scrollable Gap Items List

## Problem
Two issues prevent the scroll from working:

1. **`INITIAL_VISIBLE = 10`** — The list shows 10 items before requiring "Show all", but the scroll should activate at 7+ items. Users see all items without scrolling.
2. **ScrollArea needs explicit height** — `max-h-[350px]` on `ScrollArea` alone doesn't constrain the Radix viewport. The height must be set so the internal viewport can calculate overflow.

## Changes

**File:** `src/components/dashboard/sales/RevenueGapDrilldown.tsx`

1. Change `INITIAL_VISIBLE` from `10` to `7`
2. Change the ScrollArea to always wrap the list, with a fixed `h-[350px]` applied when `showAll && items > 7`, otherwise let it size naturally using `max-h-fit`

```tsx
// Line 19
const INITIAL_VISIBLE = 7;

// Line 162 — use h-[350px] (not max-h) so Radix viewport knows the boundary
<ScrollArea className={cn(showAll && data.gapItems.length > 7 ? 'h-[350px]' : '')}>
```

