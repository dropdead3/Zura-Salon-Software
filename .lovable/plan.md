

# Analytics Audit Pass 6: Remaining Gaps and Bugs

## Your Question — Why `phorest_staff_name` in ai-scheduling-copilot?

Good catch questioning this. The original bug was that the function queried `phorest_staff_mappings` (plural) — a table that does not exist. The fix correctly changed it to `phorest_staff_mapping` (singular). As for the column `phorest_staff_name` — I verified this is a real column on the `phorest_staff_mapping` table (confirmed via schema query). So that part of the fix is correct: the table has `phorest_staff_id`, `user_id`, `phorest_staff_name`, and other columns. The function uses it as a display name fallback, which is valid.

---

## New Findings

### Bug 1 — `usePhorestStaffSales` uses raw `total_price` (no tip adjustment, no pagination)
**File:** `src/hooks/useSalesData.ts` (lines 772, 820-821)
The staff sales leaderboard query selects `total_price` but not `tip_amount`, and revenue is summed without tip subtraction. Also no pagination — a multi-location org could exceed 1000 rows.

### Bug 2 — `useClientRetentionReport.ts` uses raw `total_price` for client LTV (no tip adjustment)
**File:** `src/hooks/useClientRetentionReport.ts` (lines 148, 162, 181)
Client LTV (`totalSpend`) sums raw `total_price`. Neither the date-range query (line 148) nor the all-time query (line 162) selects `tip_amount`.

### Bug 3 — `useClientRetentionReport.ts` all-time appointment query has no pagination
**File:** `src/hooks/useClientRetentionReport.ts` (lines 160-163)
An unbounded all-time query on `phorest_appointments` with no `.range()` or batching. Any salon with >1000 lifetime appointments will get truncated LTV data.

### Bug 4 — `useCapacityUtilization.ts` has no pagination
**File:** `src/hooks/useCapacityUtilization.ts` (lines 183-194)
30-day appointment query with no batching. Multi-stylist salons doing 40+ appointments/day will hit the 1000-row limit in under a month.

### Bug 5 — `useStaffUtilization.ts` has no pagination
**File:** `src/hooks/useStaffUtilization.ts` (lines 109-125)
Up to 90-day range with no pagination. Same truncation risk.

### Bug 6 — `usePhorestPerformanceMetrics` still queries stale `phorest_performance_metrics`
**File:** `src/hooks/usePhorestSync.ts` (lines 138-162)
This hook is consumed by the Leaderboard (`LeaderboardContent.tsx`) and Stats page (`Stats.tsx`). It reads from the stale `phorest_performance_metrics` table, meaning those surfaces show outdated data. This is a UI data integrity issue — not just dead code.

---

## Implementation Plan

### Task 1 — Fix `usePhorestStaffSales` tip adjustment + pagination
- Add `tip_amount` to select (line 772)
- Subtract `tip_amount` from revenue (lines 820-821)
- Replace single query with `fetchAllBatched`

### Task 2 — Fix `useClientRetentionReport.ts` tip adjustment + pagination
- Add `tip_amount` to both select queries (lines 148, 162)
- Subtract `tip_amount` from `totalSpend` (line 181)
- Replace all-time query with `fetchAllBatched`
- Replace date-range query with `fetchAllBatched`

### Task 3 — Add pagination to `useCapacityUtilization.ts`
Replace single query with `fetchAllBatched`.

### Task 4 — Add pagination to `useStaffUtilization.ts`
Replace single query with `fetchAllBatched`.

### Task 5 — Deprecate or replace `usePhorestPerformanceMetrics`
Replace the stale-table query with live computation from `phorest_appointments` and `phorest_transaction_items` for the Leaderboard and Stats surfaces. The hook should compute `total_revenue`, `rebooking_rate`, `retention_rate`, `new_clients`, `average_ticket` from live data, matching the pattern already established in `useIndividualStaffReport.ts`.

---

## Summary

| Type | Count | Files |
|---|---|---|
| Bugs (wrong data) | 2 | `usePhorestStaffSales` (tip-inclusive), `useClientRetentionReport` (tip-inclusive LTV) |
| Bugs (truncation) | 3 | `useClientRetentionReport`, `useCapacityUtilization`, `useStaffUtilization` |
| Bugs (stale data) | 1 | `usePhorestPerformanceMetrics` (Leaderboard + Stats page) |

5 tasks, 5 files changed, no database changes.

