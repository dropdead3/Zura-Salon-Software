

## Redefine Expected Revenue to Include All Scheduled Appointments

### The Problem

Right now, "expected revenue" is calculated by `useSalesMetrics` which filters out cancelled and no-show appointments. So cancellations and no-shows are never part of the expected number. But the gap drilldown lists them as reasons for the gap — which is logically inconsistent. If they were never counted as expected, they can't explain the shortfall.

### The Fix

Change the expected revenue passed to the gap analysis to include **all originally-scheduled appointments** (cancelled + no-show + completed). This makes the gap breakdown honest: the full picture of what was on the books vs what was actually collected.

### What Changes

**1. New hook: `useScheduledRevenue`** (in `useRevenueGapAnalysis.ts`)

A small query that sums `total_price` from `phorest_appointments` for the date range with **no status filter** — all appointments regardless of status. This becomes the "Scheduled Revenue" number used for gap analysis.

**2. Update `AggregateSalesCard.tsx`**

- Use the new `useScheduledRevenue` as the expected value passed to `useRevenueGapAnalysis` instead of `metrics?.totalRevenue`
- The "Expected" badge label changes to "Scheduled" to make the meaning clearer — this is what was on the books before cancellations, no-shows, and POS discrepancies
- The existing `metrics?.totalRevenue` (completed-only) continues to be the primary revenue display — no change there

**3. No changes to `useRevenueGapAnalysis` logic**

The gap items (cancellations, no-shows, pricing variances) remain as-is. They now correctly explain the difference between "all scheduled" and "actually collected."

### Files Modified

| File | Change |
|---|---|
| `src/hooks/useRevenueGapAnalysis.ts` | Add `useScheduledRevenue(dateFrom, dateTo, locationId, enabled)` hook that queries all appointments without status filter |
| `src/components/dashboard/AggregateSalesCard.tsx` | Call `useScheduledRevenue` and pass its value as expected revenue to `useRevenueGapAnalysis`. Update the badge label from "Expected" to "Scheduled" |

### Technical Details

- `useScheduledRevenue` query: `SELECT SUM(total_price) FROM phorest_appointments WHERE appointment_date BETWEEN dateFrom AND dateTo` — no status exclusion, respects location filter
- The primary card revenue number remains unchanged (completed appointments only from `useSalesMetrics`)
- Gap math: `scheduledRevenue - actualPOSRevenue = total gap`, broken down by cancellations + no-shows + pricing variances + unexplained

