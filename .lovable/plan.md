

# Fix Swatch Popover Scroll

## Problem
The `ScrollArea` wrapping the swatch grid has `max-h-[350px]` but the popover content isn't properly constraining height, so ~120 swatches overflow without a visible scrollbar. The `PopoverContent` itself needs a max-height so the `ScrollArea` can activate.

## Change

**File:** `src/components/platform/backroom/SwatchPicker.tsx`

1. Add `max-h-[60vh]` and `overflow-hidden` to the `PopoverContent` so the popover never exceeds 60% of viewport height
2. Change `ScrollArea` from `max-h-[350px]` to `max-h-[calc(60vh-80px)]` (subtracting header + footer space) — or simpler: keep `max-h-[350px]` but add `overflow-y-auto` as a fallback and ensure the `ScrollArea` viewport has proper height via a wrapping `div` with explicit `max-h`
3. Alternatively, the simplest fix: wrap the swatch grid `div` inside ScrollArea with a fixed height using `h-[350px]` instead of `max-h` so the ScrollArea always activates its scrollbar when content overflows

Specifically:
- Line 264: Change `<ScrollArea className="max-h-[350px]">` to `<ScrollArea className="h-[350px]">`  
- This ensures the ScrollArea always has a defined height boundary, making the Radix scroll viewport properly constrain and show the scrollbar

