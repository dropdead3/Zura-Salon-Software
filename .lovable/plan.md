

# Wire Phorest Staff Into Analytics — Continued

## Problem Diagnosis

After the previous backfill (user_id + location_id), the database is correctly linked. However, three issues remain:

### Issue 1: Staff Revenue Leaderboard shows "No revenue data"
The `useStaffRevenuePerformance` hook queries `phorest_daily_sales_summary`, which has **no data after Feb 25** (sync stopped). Meanwhile, `phorest_sales_transactions` has data through Apr 4. Per the project's POS-first data integrity standard, the leaderboard should query raw transactions directly.

### Issue 2: Stylist Workload Distribution shows "No appointment data"
Bug in `useStaffUtilization.ts` line 69: `endDateStr = format(today, ...)` instead of `format(endDate, ...)`. For the default 30-day forward range, this creates a query where `startDate > endDate` (tomorrow > today), returning zero rows. There are 145 future appointments waiting to display.

### Issue 3: Stale summary data blocks multiple downstream surfaces
The `phorest_daily_sales_summary` table feeds the leaderboard, forecasting, anomaly detection, health scores, and more. A re-sync of sales data will repopulate it. But the leaderboard should also be resilient to stale summaries by falling back to raw transactions.

## Plan

### 1. Fix `useStaffUtilization.ts` — endDate bug
**File: `src/hooks/useStaffUtilization.ts`**

Change line 69 from:
```typescript
const endDateStr = format(today, 'yyyy-MM-dd');
```
to:
```typescript
const endDateStr = format(endDate, 'yyyy-MM-dd');
```

This immediately unblocks Stylist Workload Distribution for all 22 mapped staff.

### 2. Rebuild `useStaffRevenuePerformance` to use raw transactions
**File: `src/hooks/useStaffRevenuePerformance.ts`**

Replace the `phorest_daily_sales_summary` query with a query against `phorest_sales_transactions` (which has current data). Aggregate by `phorest_staff_id` from the transactions table, joining to `phorest_staff_mapping` and `employee_profiles` the same way. This follows the POS-first integrity model and makes the leaderboard resilient to summary sync gaps.

### 3. Trigger a sales re-sync to repopulate daily summaries
Use the existing sync mechanism to re-sync sales data, which will rebuild `phorest_daily_sales_summary` with current data. This fixes all downstream edge functions (forecasting, anomaly detection, health scores, daily huddle) that depend on the summary table.

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useStaffUtilization.ts` | Fix endDateStr to use `endDate` instead of `today` |
| `src/hooks/useStaffRevenuePerformance.ts` | Query `phorest_sales_transactions` instead of stale summary table |

## What This Fixes

- Stylist Workload Distribution: Shows 22 staff with future appointment counts
- Staff Revenue Leaderboard: Shows current month revenue rankings from live transaction data
- All downstream analytics that depend on appointment and transaction data being properly user-scoped (already fixed by previous backfill)

