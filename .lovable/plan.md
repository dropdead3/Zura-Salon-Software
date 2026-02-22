

# Fix DayView Hover Tooltip: Wider Card, Centered on Appointment

## Problem

The current tooltip uses `!fixed !left-1/2 !top-1/2` CSS hacks that conflict with Radix's internal positioning engine, causing unpredictable placement. The card is also too narrow at `max-w-xs` (320px), cramming multi-service text.

## Solution

Remove the fixed-positioning hack and use Radix's native tooltip positioning to center the tooltip over the appointment card. Widen the tooltip for better readability.

**File:** `src/components/dashboard/schedule/DayView.tsx` (line 482)

### Changes

1. **Remove fixed-position overrides** -- delete `!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !transform`
2. **Set `side="top"`** with `align="center"` -- this anchors the tooltip centered above/below the card, letting Radix handle collision avoidance automatically
3. **Add `collisionPadding={16}`** -- ensures 16px breathing room from viewport edges
4. **Widen to `max-w-sm`** (384px) -- prevents text wrapping on service names and phone numbers
5. **Set `sideOffset={8}`** -- clean spacing between card and tooltip

### Result

```
// Before (broken fixed positioning)
<TooltipContent side="bottom" sideOffset={0}
  className="max-w-xs !fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !transform z-[100]">

// After (native Radix centering)
<TooltipContent side="top" align="center" sideOffset={8} collisionPadding={16}
  className="max-w-sm z-[100]">
```

Single prop change on one line. Radix handles collision detection natively -- if the card is near the top edge, the tooltip flips to bottom; if near the sides, it shifts horizontally. No CSS hacks needed.

