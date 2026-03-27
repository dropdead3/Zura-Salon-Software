

# Enable Gap Report for Today's Filter

## Problem
When filtered to "today", clicking the Expected badge does nothing visible because:
1. The gap analysis query is gated by `isPastRange` (which is `false` for today)
2. The `RevenueGapDrilldown` component is only rendered inside the past-range block
3. Appointments that haven't concluded yet (status `confirmed`, `pending`, etc.) aren't represented as a gap reason

## Solution
Enable gap analysis for today by also fetching/displaying it when `isToday`, and add a new `not_concluded` gap reason for appointments still in progress.

## Changes

### 1. `src/hooks/useRevenueGapAnalysis.ts`
- Add `'not_concluded'` to the `GapReason` type
- Expand the appointment status filter to also fetch `confirmed`/`pending` statuses
- Add logic to categorize non-completed, non-cancelled, non-no-show appointments as `not_concluded` gap items
- Add label `'Not yet concluded'` to `reasonLabels` and include in `reasonOrder`

### 2. `src/components/dashboard/sales/RevenueGapDrilldown.tsx`
- Add `not_concluded` entry to `REASON_CONFIG` with a clock icon and neutral styling
- Import `Clock` from lucide-react

### 3. `src/components/dashboard/AggregateSalesCard.tsx`
- Update the gap analysis `enabled` condition (line 372) to also fire when `isToday`:
  ```
  (isPastRange || isToday) && activeDrilldown === 'expectedGap' && scheduledRevenue != null
  ```
- For today, pass `displayMetrics.totalRevenue` as expectedRevenue and `todayActual?.actualRevenue ?? 0` as actualRevenue to the hook
- Add a `<RevenueGapDrilldown>` inside the today block (after the progress bar / estimated-final-time section, before the last-updated timestamp), rendering when `activeDrilldown === 'expectedGap'`

