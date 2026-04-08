

# Analytics Audit Pass 11: Remaining Issues

After ten passes, the remaining gaps are narrower. This pass focuses on pagination risks in hooks not yet covered, plus one tip-adjustment gap and one logic issue.

## Findings

### Bug 1 — `useRealizationRate.ts` transaction items query has no pagination (line 59)
The POS transaction items query (step 2) fetches 30 days of data without batching. The appointments query (step 1) was fixed in a prior pass, but the transaction items query was missed. A busy salon with 1000+ transaction items in 30 days will get truncated actual revenue, producing an artificially low realization rate.

**Fix:** Use `fetchAllBatched` for the transaction items query.

### Bug 2 — `useTransactionsByHour.ts` both queries have no pagination (lines 14, 41)
Step 1 (POS client IDs) and Step 2 (appointments for hour mapping) both fetch without pagination. A month of transaction items or appointments can exceed 1000 rows, truncating the hourly distribution data.

**Fix:** Use `fetchAllBatched` for both queries.

### Bug 3 — `useAssistantActivity.ts` appointment IDs query has no pagination (line 26)
The initial query fetching all appointment IDs in a date range has no pagination. If a salon has 1000+ appointments in the range, some assistant assignments will be missed entirely. The subsequent `assignments` query using `.in('appointment_id', ids)` also risks hitting the PostgREST URL length limit for large ID arrays.

**Fix:** Use `fetchAllBatched` for the appointment IDs query. Chunk the `.in()` call for the assignments query.

### Bug 4 — `useStaffRevenuePerformance.ts` two queries have no pagination (lines 68, 83)
Both the `phorest_sales_transactions` query and the `phorest_transaction_items` query fetch without batching. A 90-day or 365-day range across a multi-location org will easily exceed 1000 rows on both tables, silently truncating staff revenue and service/product breakdowns.

**Fix:** Use `fetchAllBatched` for both queries.

### Bug 5 — `useServiceMenuIntelligence.ts` transaction items query has no pagination (line 44)
Fetches 8 weeks of service transaction items without batching. A multi-location org with hundreds of services per week can exceed 1000 rows, truncating declining-service detection and bundle suggestions.

**Fix:** Use `fetchAllBatched`.

### Bug 6 — `useTipsDrilldown.ts` payment method transaction items query has no pagination (line 147)
The secondary query for payment method tip data fetches without batching. This is separate from the main appointments query (fixed in Pass 9). If many transactions have tips in the range, data will truncate, skewing the payment method breakdown.

**Fix:** Use `fetchAllBatched`.

### Bug 7 — `useAssistantActivity.ts` revenue uses raw `total_price` without tip subtraction (line 99-100)
The `assistedRevenue` calculation sums raw `total_price` without subtracting `tip_amount`. The query (line 49) doesn't even select `tip_amount`.

**Fix:** Add `tip_amount` to the appointment select and subtract it from the revenue calculation.

---

## Implementation Plan

### Task 1 — Fix `useRealizationRate.ts` pagination
Migrate the transaction items query (line 59) to `fetchAllBatched`.

### Task 2 — Fix `useTransactionsByHour.ts` pagination (2 queries)
Migrate both the POS client IDs query and the appointments query to `fetchAllBatched`.

### Task 3 — Fix `useAssistantActivity.ts` (pagination + tip adjustment)
- Use `fetchAllBatched` for the appointment IDs query
- Add `tip_amount` to appointment select, subtract from `assistedRevenue`

### Task 4 — Fix `useStaffRevenuePerformance.ts` pagination (2 queries)
Migrate both the sales transactions and transaction items queries to `fetchAllBatched`.

### Task 5 — Fix `useServiceMenuIntelligence.ts` and `useTipsDrilldown.ts` pagination
- `useServiceMenuIntelligence`: migrate transaction items query to `fetchAllBatched`
- `useTipsDrilldown`: migrate payment method query to `fetchAllBatched`

---

## Summary

| Type | Count | Files |
|---|---|---|
| Bug (wrong data) | 1 | `useAssistantActivity` (tip-inclusive assisted revenue) |
| Bug (truncation) | 8 | `useRealizationRate`, `useTransactionsByHour` (2), `useAssistantActivity`, `useStaffRevenuePerformance` (2), `useServiceMenuIntelligence`, `useTipsDrilldown` |

5 tasks, 6 files changed, no database changes.

