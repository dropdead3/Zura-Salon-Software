

## Problem

In `AggregateSalesCard.tsx`, when a multi-day date range is selected, the "Daily Avg" card renders **below** the Transactions/Avg Ticket/Rev/Hour row. User wants it **above** those three cards.

## Plan

**File: `src/components/dashboard/sales/AggregateSalesCard.tsx`**

In the `showDailyAvg` branch (lines 1256-1330), swap the order of the two child divs inside `space-y-3`:

1. Move the Daily Avg card block (lines 1317-1328) **above** the 3-column grid (lines 1258-1316)
2. No other changes needed — just reorder the two sibling `<div>` elements

### Files modified
- `src/components/dashboard/AggregateSalesCard.tsx`

