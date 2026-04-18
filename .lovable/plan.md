

## Goal
Move the `RetailPerformanceAlert` from a sibling card beneath `RevenueDonutChart` into the bottom of the Revenue Breakdown card itself, so it reads as part of the same surface.

## Approach
1. **`RevenueDonutChart.tsx`** — accept the verdict inputs it already computes internally (`trueRetailPercent`, `retailAttachmentRate`, `total`, `hasBreakdown`) and render `<RetailPerformanceAlert>` inside `CardContent`, after the donut+metrics row, separated by a top border (`border-t border-border/40 pt-4 mt-2`). The alert component's existing `null` return preserves the silence doctrine — no empty space when sub-materiality.

2. **`RetailPerformanceAlert.tsx`** — add an `embedded` prop (default `false`). When `embedded`, render without the outer `<Card>` wrapper — just the inner `flex items-start gap-3` row plus the tier-tinted left border rail (`border-l-4` on the row itself) and background wash. This avoids a card-inside-a-card visual.

3. **Parent components** — remove the now-redundant `<RetailPerformanceAlert>` mounted below the donut in:
   - `src/components/dashboard/AggregateSalesCard.tsx`
   - `src/components/dashboard/CommandCenterAnalytics.tsx`
   - `src/components/dashboard/PinnedAnalyticsCard.tsx`
   
   Also remove the wrapping `<div className="flex flex-col gap-3">` if it's no longer needed.

## Visual result
The Revenue Breakdown card grows by one row at the bottom (only when material). Color-coded left rail + icon + tier label + advisory copy live inside the same card border as the donut and metrics — one cohesive surface.

## Out of scope
- Tier thresholds or copy
- Materiality gate
- Tooltip/icon changes

## Files
- **Modify**: `src/components/dashboard/sales/RevenueDonutChart.tsx` — render embedded alert inside CardContent
- **Modify**: `src/components/dashboard/sales/RetailPerformanceAlert.tsx` — add `embedded` variant
- **Modify**: `AggregateSalesCard.tsx`, `CommandCenterAnalytics.tsx`, `PinnedAnalyticsCard.tsx` — remove sibling alert mount

