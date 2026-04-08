

# Analytics Audit Pass 8: Remaining Issues

## Findings

### Bug 1 — `useNewBookings.ts` revenue uses raw `total_price` (no tip subtraction)
**File:** `src/hooks/useNewBookings.ts` (line 297)
`bookedInRangeRevenue` sums raw `total_price` without subtracting `tip_amount`. The query (line 119) does not even select `tip_amount`.

**Fix:** Add `tip_amount` to the select string. Line 297: `sum + ((Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0))`.

### Bug 2 — `useNewBookings.ts` prior-appointment check uses hard `limit(1000)`
**File:** `src/hooks/useNewBookings.ts` (line 142)
The query to detect whether clients have prior visits uses `.limit(1000)`. If more than 1000 unique clients had prior appointments, some will be missed — causing returning clients to be falsely classified as "new." This should use distinct client IDs or paginate properly.

**Fix:** Since the query only needs to know *which* clients have prior visits (not all their appointments), the `.limit(1000)` is risky but acceptable in practice because the query returns distinct `phorest_client_id` values from the `.in()` filter (max = `rangeClientIds.length`). However, if `rangeClientIds` is large, the `.in()` clause itself may need chunking. More importantly, the result set could exceed 1000 if many clients have multiple prior appointments. The fix is to either add a `DISTINCT` via an RPC or paginate.

**Pragmatic fix:** Since we only need unique client IDs from the result, paginate with `fetchAllBatched` to ensure all results are captured.

### Bug 3 — `useNewBookings.ts` no pagination on main range query (line 116)
The main range query fetching all bookings has no pagination. A busy multi-location salon creating hundreds of appointments per week can exceed 1000.

**Fix:** Use `fetchAllBatched`.

### Bug 4 — `useNewBookings.ts` 30-day comparison queries have no pagination (lines 162-179)
The `last30Res` and `prev30Res` queries fetch all appointment IDs in 30-day windows without pagination. Only the `.length` is used, but if count exceeds 1000, the comparison percentage is wrong.

**Fix:** Use `fetchAllBatched` or switch to a `.select('id', { count: 'exact', head: true })` count-only query (more efficient).

### Bug 5 — `useServiceClientAnalysis.ts` has no pagination (line 38)
The query fetches all appointments in a date range without pagination. Truncation risk for busy salons.

**Fix:** Use `fetchAllBatched`.

### Bug 6 — `useRedoAnalytics.ts` has no pagination (line 54)
The redo analytics query fetches all appointments in a 30-day window across all org locations without pagination. Multi-location orgs will hit the 1000-row limit.

**Fix:** Use `fetchAllBatched`.

### Bug 7 — `useForecastRevenue.ts` and `useWeekAheadRevenue.ts` have no pagination
**Files:** `src/hooks/useForecastRevenue.ts` (line 115), `src/hooks/useWeekAheadRevenue.ts` (line 80)
Both forecast hooks query all appointments in a multi-day range without pagination. A multi-location salon with 200+ appointments per day could exceed 1000 in a 7-day forecast window.

**Fix:** Use `fetchAllBatched` for both.

### Bug 8 — `useLevelEconomicsAnalyzer.ts` appointments query has no pagination (line 128)
Queries the `appointments` table for 3+ months of data without pagination. High-volume orgs will get truncated results.

**Fix:** Use `fetchAllBatched`.

---

## Implementation Plan

### Task 1 — Fix `useNewBookings.ts` (tip adjustment + pagination on 4 queries)
- Add `tip_amount` to select, subtract from revenue (line 297)
- Use `fetchAllBatched` for main range query (line 116)
- Use `fetchAllBatched` for prior-appointment check (line 136) 
- Convert 30-day comparison queries to count-only (`head: true, count: 'exact'`) to avoid pagination entirely

### Task 2 — Add pagination to `useServiceClientAnalysis.ts`
Replace single query with `fetchAllBatched`.

### Task 3 — Add pagination to `useRedoAnalytics.ts`
Replace single query with `fetchAllBatched`.

### Task 4 — Add pagination to `useForecastRevenue.ts` and `useWeekAheadRevenue.ts`
Replace single queries with `fetchAllBatched` in both hooks.

### Task 5 — Add pagination to `useLevelEconomicsAnalyzer.ts`
Replace the `appointments` table query with `fetchAllBatched`.

---

## Summary

| Type | Count | Files |
|---|---|---|
| Bug (wrong data) | 1 | `useNewBookings` (tip-inclusive revenue) |
| Bug (truncation) | 7 | `useNewBookings` (3 queries), `useServiceClientAnalysis`, `useRedoAnalytics`, `useForecastRevenue`, `useWeekAheadRevenue`, `useLevelEconomicsAnalyzer` |

5 tasks, 6 files changed, no database changes.

