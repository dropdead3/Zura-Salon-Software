

## Problem

The popover's `max-h-[min(420px,var(--radix-popover-content-available-height))]` CSS is likely not being compiled correctly by Tailwind (commas inside arbitrary values can cause issues). The Team tab list gets cut off with no scroll.

## Plan

**File:** `src/components/dashboard/ViewAsPopover.tsx`

1. Replace the problematic Tailwind arbitrary value with an inline `style` prop for the max-height, which guarantees correct CSS output:

```tsx
<PopoverContent
  align="end"
  sideOffset={16}
  className="w-80 p-0 bg-card/80 backdrop-blur-xl backdrop-saturate-150 border border-border/30 rounded-xl shadow-2xl overflow-hidden flex flex-col"
  style={{ maxHeight: 'min(420px, var(--radix-popover-content-available-height))' }}
>
```

This is one line change — moving the max-height constraint from a Tailwind class to an inline style so the CSS `min()` function with its comma is handled correctly by the browser rather than potentially being mangled by Tailwind's class parser.

