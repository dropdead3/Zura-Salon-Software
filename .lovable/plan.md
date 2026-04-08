

# Analytics Audit Pass 7: Remaining Issues

## Findings

### Bug 1 — `useIndividualStaffReport.ts` missing `is_new_client` in appointment selects (lines 226, 230, 234)
The `computeClientMetrics` function (line 278) checks `a.is_new_client === true` to compute retention rate and new client counts. However, the three appointment queries (current, prior, two-prior) do not include `is_new_client` in their `.select()` strings. This means `is_new_client` is always `undefined`, so `newClients` is always 0 and `retentionRate` is always 100% — both wrong.

**Fix:** Add `is_new_client` to all three select strings on lines 226, 230, and 234.

### Bug 2 — `useIndividualStaffReport.ts` team averages query has no pagination (line 292)
The "all staff appointments" query for computing team averages fetches without `.range()` or batching. For a multi-stylist org over a 30-day range, this can exceed 1000 rows, truncating team benchmark data.

**Fix:** Use `fetchAllBatched` for this query.

### Bug 3 — `useRevenueGapAnalysis.ts` appointment query has no pagination (line 116)
The gap analysis fetches all appointments in a date range without pagination. A busy salon over a multi-day range can exceed 1000 rows, silently truncating gap items.

**Fix:** Use `fetchAllBatched` for the appointment query.

### Bug 4 — `useRevenueGapAnalysis.ts` POS items query has no pagination (lines 217-235)
POS items are fetched in 100-client chunks but each chunk query has no pagination — any chunk with >1000 POS items would truncate.

**Fix:** Use `fetchAllBatched` inside the chunk loop, or restructure to batch by client+date more efficiently.

### Bug 5 — `useClientTypeSplit.ts` both queries have no pagination (lines 43, 64)
Step 1 (POS client IDs) and Step 2 (appointments) both fetch without pagination. A month of data for a multi-location org can easily exceed 1000 rows on both.

**Fix:** Use `fetchAllBatched` for both queries.

### Bug 6 — `useTodaysQueue.ts` revenue uses raw `total_price` (line 179)
Today's queue revenue sums `total_price` without subtracting `tip_amount`. This is a tip-inclusive revenue figure shown on the operational queue dashboard.

**Fix:** Select `tip_amount` and subtract it: `(apt.total_price || 0) - (apt.tip_amount || 0)`.

### Bug 7 — `useScheduledRevenue` (in `useRevenueGapAnalysis.ts`) has no pagination (line 33)
The scheduled revenue query fetches all appointments in a date range without batching.

**Fix:** Use `fetchAllBatched`.

---

## Implementation Plan

### Task 1 — Fix `useIndividualStaffReport.ts` (2 issues)
- Add `is_new_client` to select strings on lines 226, 230, 234
- Migrate team averages query (line 292) to `fetchAllBatched`

### Task 2 — Fix `useRevenueGapAnalysis.ts` pagination (3 queries)
- `useScheduledRevenue` (line 22-34): use `fetchAllBatched`
- Gap analysis appointment query (line 105-116): use `fetchAllBatched`
- POS items chunk queries (lines 220-232): add pagination per chunk

### Task 3 — Fix `useClientTypeSplit.ts` pagination (2 queries)
- POS client IDs query (line 32-43): use `fetchAllBatched`
- Appointments query (line 52-64): use `fetchAllBatched`

### Task 4 — Fix `useTodaysQueue.ts` tip adjustment
- Add `tip_amount` to the PhorestAppointment interface and query select
- Subtract `tip_amount` from revenue calculation (line 179)

---

## Summary

| Type | Count | Files |
|---|---|---|
| Bug (wrong data) | 2 | `useIndividualStaffReport` (new client metrics always 0), `useTodaysQueue` (tip-inclusive revenue) |
| Bug (truncation) | 5 | `useIndividualStaffReport` (team avg), `useRevenueGapAnalysis` (3 queries), `useClientTypeSplit` (2 queries) |

4 tasks, 4 files changed, no database changes.

