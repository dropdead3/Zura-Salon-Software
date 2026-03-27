

# Make "Where the Gap Came From" List Scrollable

## Problem
When there are many gap items (and the user clicks "Show all"), the list grows unbounded and pushes the dialog content beyond comfortable viewing. The screenshot shows 12+ items with no scroll constraint.

## Solution
Wrap the gap items list in a `ScrollArea` with a max height equivalent to ~7 rows (~350px). The list scrolls when items exceed 7; otherwise it renders naturally without a scrollbar.

## Changes

**File:** `src/components/dashboard/sales/RevenueGapDrilldown.tsx`

- Import `ScrollArea` from `@/components/ui/scroll-area`
- Wrap the `<div className="space-y-1">` containing the `GapItemRow` map in a `<ScrollArea className="max-h-[350px]">` so it becomes scrollable when expanded beyond 7 items
- The "Show all" button and summary section remain outside the scroll area

