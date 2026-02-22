

# Fix: Tooltip Clipping Off-Screen in DayView

## Problem

The appointment hover tooltip in DayView uses `side="right"` which works for most columns, but when the appointment card is near the left edge of the viewport, the tooltip content extends beyond the visible area and gets cut off (as seen in the screenshot).

## Root Cause

The `TooltipContent` on line 482 of `DayView.tsx` has `side="right"` but no collision boundary or padding configured. Radix Tooltip does support automatic collision detection, but it needs `collisionPadding` to account for viewport edges properly.

## Fix

**File:** `src/components/dashboard/schedule/DayView.tsx`

- Change the `TooltipContent` props to add `collisionPadding={16}` and `sideOffset={8}` so Radix's collision detection flips the tooltip to whichever side has more room, with breathing space from the viewport edge.

This is a single-line prop change -- no new files, no structural changes.

## Technical Detail

```
// Before
<TooltipContent side="right" className="max-w-xs">

// After
<TooltipContent side="right" sideOffset={8} collisionPadding={16} className="max-w-xs">
```

Radix's built-in collision avoidance will automatically flip to `left`, `top`, or `bottom` when the preferred `right` side doesn't have enough space.

