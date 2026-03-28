

## Problem

The fixed `h-[420px]` on the popover forces all tabs to be 420px tall regardless of content. Tabs with little content (Roles with 2 items, Test with a placeholder) show a tiny content area surrounded by vast empty space. The popover should size naturally to its content but cap at a reasonable max height when content overflows.

## Plan

**File:** `src/components/dashboard/ViewAsPopover.tsx`

1. **Remove the fixed height, add a capped max-height**: Replace `h-[420px] max-h-[var(--radix-popover-content-available-height)]` with just `max-h-[min(420px,var(--radix-popover-content-available-height))]`. This lets the popover shrink to fit small content but caps at 420px (or viewport limit) when content is large. The `overflow-hidden flex flex-col` stays for scroll support.

### Single change on line 119

```
// Before
h-[420px] max-h-[var(--radix-popover-content-available-height)] overflow-hidden flex flex-col

// After  
max-h-[min(420px,var(--radix-popover-content-available-height))] overflow-hidden flex flex-col
```

This way: Roles tab with few items stays compact, Team tab with many members scrolls at 420px, Test tab stays small. No wasted space.

