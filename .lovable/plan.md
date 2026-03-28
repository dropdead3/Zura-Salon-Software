

## Problem

The `max-h-[--radix-popover-content-available-height]` class isn't working because Tailwind's arbitrary value syntax requires `var()` for CSS custom properties. The popover opens at full size without scrolling.

## Plan

**File:** `src/components/dashboard/ViewAsPopover.tsx`

1. Fix the CSS custom property reference on `PopoverContent` (line 119):
   - Change `max-h-[--radix-popover-content-available-height]` → `max-h-[var(--radix-popover-content-available-height)]`

This single fix will make the popover constrain to available viewport space and enable the internal `ScrollArea` to scroll properly.

