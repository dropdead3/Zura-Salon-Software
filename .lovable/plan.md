

# Fix Schedule Key Popover Scroll

## Problem

The `ScrollArea` wrapping the legend content has `max-h-[60vh]` but the Radix ScrollArea viewport (`h-full w-full`) doesn't respect `max-h` alone -- it needs an explicit height or overflow constraint to activate scrolling.

## Fix

**File: `src/components/dashboard/schedule/ScheduleLegend.tsx`**

Change the `ScrollArea` wrapper to use a fixed `h-[60vh]` instead of `max-h-[60vh]`, and add `overflow-hidden` to the `PopoverContent` so it doesn't expand beyond the scroll container.

Specifically:
- Line 246: Add `overflow-hidden` to PopoverContent className
- Line 252: Change `max-h-[60vh]` to `h-[60vh]` on ScrollArea

This ensures the Radix scroll viewport has a concrete height to scroll within, while the popover itself clips content at its boundary.

| File | Change |
|---|---|
| `src/components/dashboard/schedule/ScheduleLegend.tsx` | Fix ScrollArea height constraint and add overflow-hidden to PopoverContent |

