

# Analytics Audit Pass 5: Remaining Issues

## Findings

### Bug 1 — `useIndividualStaffReport.ts` client revenue uses raw `total_price` (line 471)
The "Top Clients" section computes client revenue from `total_price` without subtracting `tip_amount`. Additionally, the prior/two-prior appointment queries (lines 230, 234) don't select `tip_amount`, so if those are used for revenue elsewhere in the same hook they'd also be tip-inclusive.

**Fix:** Line 471: `c.revenue += (Number(a.total_price) || 0) - (Number(a.tip_amount) || 0)`. Add `tip_amount` to the prior/two-prior select strings.

### Bug 2 — `useServiceMix` and `useSalesTrend` have no pagination (lines 612, 648)
Both query `phorest_appointments` without pagination. A month of data for a multi-location org can exceed 1000 rows, silently truncating results. The tip adjustment was added but pagination was not.

**Fix:** Use `fetchAllBatched` for both queries.

### Bug 3 — `useGoalPeriodRevenue.ts` still has local pagination instead of `fetchAllBatched`
This file has the old manual `while (hasMore)` loop. Functionally correct but inconsistent — should use the shared utility per the consolidation initiative.

**Fix:** Replace manual loop with `fetchAllBatched`.

### Bug 4 — `ai-scheduling-copilot` edge function queries `phorest_staff_mappings` (plural, line 107)
The table name is `phorest_staff_mapping` (singular). This silently fails, returning no staff names for scheduling copilot responses.

**Fix:** Change to `phorest_staff_mapping` and adjust the select to match actual column names (`staff_first_name`/`staff_last_name` may not exist — verify and use the join to `employee_profiles` instead).

### Bug 5 — `useIndividualStaffReport.ts` daily revenue includes tax only for products (line 387)
`dailyRevMap` adds `tax_amount` only for product items: `amount + (isProduct ? tax : 0)`. This means service revenue in the daily trend excludes tax, while product revenue includes it. Should be consistent — include tax for both, matching POS-first standard (`total_amount + tax_amount`).

**Fix:** Line 387: change to `dailyRevMap.set(dateOnly, (dailyRevMap.get(dateOnly) || 0) + amount + tax)`.

### Enhancement — ~15 hooks still use manual pagination loops
Files like `useMyPayData`, `useComparisonData`, `usePayrollAnalytics`, `useAvgTicketByStylist`, `useOrganizationAnalytics`, `usePayrollForecasting`, `useNewClientConversion`, `useStaffRebookDrilldown`, `useServiceRetailAttachment`, `useStylistPeerAverages`, `useClientEngagement`, `useIndividualStaffReport`, `useGoalPeriodRevenue` still have manual pagination. Not a bug (functionally equivalent), but a maintainability debt.

---

## Implementation Plan

### Task 1 — Fix `useIndividualStaffReport.ts` (3 issues)
- Line 471: subtract `tip_amount` from client revenue
- Line 387: include tax for all item types in daily trend
- Lines 230, 234: add `tip_amount` to prior/two-prior appointment selects

### Task 2 — Add pagination to `useServiceMix` and `useSalesTrend`
Replace single query with `fetchAllBatched` in both functions.

### Task 3 — Migrate `useGoalPeriodRevenue.ts` to `fetchAllBatched`
Replace manual loop with shared utility.

### Task 4 — Fix `ai-scheduling-copilot` edge function table name
Change `phorest_staff_mappings` to `phorest_staff_mapping`. Use employee_profiles join for names.

---

## Summary

| Type | Count | Files |
|---|---|---|
| Bugs (wrong data) | 3 | `useIndividualStaffReport` (client rev + daily trend tax), `useServiceMix` + `useSalesTrend` (truncation) |
| Bugs (silent failure) | 1 | `ai-scheduling-copilot` (table name) |
| Consistency | 1 | `useGoalPeriodRevenue` (manual pagination) |

4 tasks, 5 files changed, no database changes.

