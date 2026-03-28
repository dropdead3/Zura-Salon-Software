

## Problem

Daily Brief's "Today's Revenue" tile is a pure duplicate of what Sales Overview and Executive Summary already show with more context. Removing it makes Daily Brief a focused operational card and eliminates redundancy regardless of which card combination is toggled on.

## Plan

**File: `src/components/dashboard/analytics/DailyBriefCard.tsx`**

1. **Remove the revenue tile** (lines 100-107) from the 4-column grid
2. **Change grid from 4 columns to 3** — update `grid-cols-2 md:grid-cols-4` to `grid-cols-3`
3. **Remove unused imports**: `DollarSign`, `useFormatCurrency`, `BlurredAmount`, `useSalesMetrics`
4. **Remove revenue-related state/hooks**: the `useSalesMetrics` call (lines 27-31), `revenue` variable, `revenueLoading`/`revenueError`/`refetchRevenue` destructuring
5. **Update MetricInfoTooltip description** to remove mention of "total revenue"
6. **Update error/retry handler** to only reference appointments (remove `refetchRevenue`)

The Daily Brief becomes a clean 3-tile operational card: **Appointments** | **No-Shows** | **Completion Rate**

### Files modified
- `src/components/dashboard/analytics/DailyBriefCard.tsx`

