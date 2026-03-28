

## Problem

The "View As" popover dynamically resizes based on each tab's content height, causing inconsistent sizing across the Roles, Team, and Test tabs. The Team tab with many members makes the popover very tall, while the Test tab is short. Need a fixed consistent height with internal scrolling.

## Plan

**File:** `src/components/dashboard/ViewAsPopover.tsx`

1. Set a fixed height on the popover content instead of letting it grow to `--radix-popover-content-available-height`. Use `h-[420px]` with a `max-h-[var(--radix-popover-content-available-height)]` fallback so it's consistent but still respects viewport bounds.

2. Ensure all three `TabsContent` panels use `flex-1 min-h-0 overflow-hidden flex flex-col` so they fill the fixed height equally.

3. Wrap the Test tab's content in a `ScrollArea` with `flex-1 min-h-0` for consistency (even though it's short, this keeps the layout uniform).

### Changes

- **Line 119** (`PopoverContent`): Change `max-h-[var(--radix-popover-content-available-height)]` to `h-[420px] max-h-[var(--radix-popover-content-available-height)]` — fixed height, capped by viewport
- **Line 244** (Test tab `TabsContent`): Add `overflow-hidden flex-1 min-h-0 flex flex-col` classes to match the other tabs
- Wrap Test tab inner content in `<ScrollArea className="flex-1 min-h-0">` for layout consistency

This gives all three tabs an identical container size with scrolling when content overflows.

