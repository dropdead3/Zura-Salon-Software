

## Problem

The "View As" popover content overflows the viewport when there are many roles/team members, and the content below the visible area is inaccessible. While `ScrollArea` is used inside each tab, the popover itself has no max-height constraint relative to the viewport, so it can extend beyond the screen.

## Plan

**File:** `src/components/dashboard/ViewAsPopover.tsx`

1. Add a viewport-aware max-height to the `PopoverContent` using Radix's CSS custom property `--radix-popover-content-available-height`, which automatically provides the remaining space between the trigger and the viewport edge.

2. Make the inner layout flex-based so the `ScrollArea` in each tab fills available space and scrolls properly.

### Changes

- On `PopoverContent` (line 116-120): add `max-h-[--radix-popover-content-available-height] overflow-hidden flex flex-col`
- On the `Tabs` wrapper (line 121): add `flex flex-col overflow-hidden flex-1 min-h-0`
- On each `TabsContent`: add `overflow-hidden flex-1 min-h-0 flex flex-col`
- On each `ScrollArea`: change from fixed `max-h-[420px]` / `max-h-[380px]` to `flex-1 min-h-0` so it fills and scrolls within the constrained popover

This ensures the popover never exceeds available viewport space and all content is scrollable.

