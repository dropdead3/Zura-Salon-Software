

# Analytics Audit Pass 12: Remaining Issues

## Findings

### Bug 1 — `useSalesAnalytics.ts` `useProductCategoryBreakdown` has no pagination (line 50)
Queries `phorest_sales_transactions` for product categories without pagination. A busy salon with 1000+ product sales in a date range will get truncated category data.

### Bug 2 — `useSalesAnalytics.ts` `useServicePopularity` has no pagination (line 97)
Queries `phorest_appointments` for service popularity without pagination. Multi-location orgs can exceed 1000 rows, truncating service frequency rankings.

### Bug 3 — `useSalesAnalytics.ts` `useClientFunnel` has no pagination (lines 153, 158)
Two queries: (1) range-filtered transactions and (2) ALL client transactions ordered by date (no date filter at all — fetches entire history). Both lack pagination. The second query is especially dangerous — it fetches every transaction ever to determine first-visit dates.

### Bug 4 — `useSalesAnalytics.ts` `usePeakHoursAnalysis` has no pagination (line 219)
Queries all transactions in a date range without pagination. Truncates peak-hour heatmap data.

### Bug 5 — `useTicketDistribution.ts` has no pagination (line 41)
Queries `phorest_sales_transactions` for ticket amounts without pagination. Truncation will skew median/average ticket calculations and bucket distributions.

### Bug 6 — `useProductSalesAnalytics.ts` has no pagination (line 71)
Queries `phorest_transaction_items` with `select('*')` without pagination. A month of transaction items will easily exceed 1000 rows, truncating product analytics.

### Bug 7 — `useLocationStaffingBalance.ts` has no pagination (line 112)
Queries all appointments in a date range without pagination. Multi-location orgs with 1000+ appointments in the range get truncated staffing balance calculations.

### Bug 8 — `useHiringForecast.ts` two queries have no pagination (lines 71, 77)
Both the recent (30-day) and prior (30-day) appointment queries lack pagination. Growth rate calculations will be wrong for high-volume orgs.

### Bug 9 — `useComparisonData.ts` category comparison queries have no pagination (lines 253, 259)
Both period A and period B category queries from `phorest_sales_transactions` lack pagination. Category-mode comparison data will truncate for busy salons.

### Bug 10 — `ServiceMixChart.tsx` has no pagination (line 35)
Queries `phorest_sales_transactions` for a single stylist's service mix without pagination. A busy stylist with 1000+ service transactions in 30 days will get truncated data (unlikely for single stylist but possible at 90-day ranges).

---

## Implementation Plan

### Task 1 — Add pagination to `useSalesAnalytics.ts` (4 queries)
- `useProductCategoryBreakdown`: migrate to `fetchAllBatched`
- `useServicePopularity`: migrate to `fetchAllBatched`
- `useClientFunnel`: migrate both queries to `fetchAllBatched`
- `usePeakHoursAnalysis`: migrate to `fetchAllBatched`

### Task 2 — Add pagination to `useTicketDistribution.ts` and `useProductSalesAnalytics.ts`
- `useTicketDistribution`: migrate to `fetchAllBatched`
- `useProductSalesAnalytics`: migrate to `fetchAllBatched`

### Task 3 — Add pagination to `useLocationStaffingBalance.ts` and `useHiringForecast.ts`
- `useLocationStaffingBalance`: migrate appointment query to `fetchAllBatched`
- `useHiringForecast`: migrate both 30-day queries to `fetchAllBatched`

### Task 4 — Add pagination to `useComparisonData.ts` and `ServiceMixChart.tsx`
- `useComparisonData`: migrate both category queries to `fetchAllBatched`
- `ServiceMixChart`: migrate to `fetchAllBatched`

---

## Summary

| Type | Count | Files |
|---|---|---|
| Bug (truncation) | 10 | `useSalesAnalytics` (4), `useTicketDistribution`, `useProductSalesAnalytics`, `useLocationStaffingBalance`, `useHiringForecast` (2), `useComparisonData` (2), `ServiceMixChart` |

4 tasks, 6 files changed, no database changes. No new tip/revenue logic bugs found — previous passes resolved those systematically.

