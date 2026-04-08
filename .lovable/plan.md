

# POS-First Migration: Fix All Stale Analytics

## Problem
The `phorest_daily_sales_summary` table stopped receiving data on Feb 21. Every hook and edge function querying it shows incorrect/missing revenue after that date. This affects graduation tracking, payroll, trends, comparisons, and forecasting across the platform.

## Approach
Switch all client-side hooks from `phorest_daily_sales_summary` to `phorest_transaction_items` using the proven `fetchAllBatched` pattern. For `appointments.total_price` usage (includes tips), switch to transaction-item-based revenue. Edge functions get the same treatment.

Revenue formula: `total_amount + tax_amount`, split by `item_type` ('service' vs other).

---

## P0 — Critical (Graduation + Payroll)

### File 1: `src/hooks/useTeamLevelProgress.ts`
- **Lines 119-131**: Replace `phorest_daily_sales_summary` query with `phorest_transaction_items` query using `stylist_user_id` in `userIds`, selecting `stylist_user_id, total_amount, tax_amount, item_type, transaction_date`. Add pagination.
- **Lines 240-250** (`computeMetrics`): Replace `service_revenue`/`product_revenue` aggregation with transaction-item-based sums. Filter by `stylist_user_id` instead of `user_id`. Classify `item_type === 'service'` vs product.
- **Lines 256-258**: Fix Avg Ticket denominator — use unique `client_id + appointment_date` from appointments instead of raw count.
- **Lines 307-309**: Fix Revenue Per Hour — use sales-based revenue (from transaction items) instead of `total_price`.

### File 2: `src/hooks/usePayrollCalculations.ts`
- **Lines 88-113** (`usePayrollSalesData`): Replace `phorest_daily_sales_summary` query with `phorest_transaction_items` using `stylist_user_id` in `employeeIds`. Add pagination. Aggregate by `stylist_user_id` splitting `total_amount + tax_amount` by `item_type`.

### File 3: `src/hooks/useMyPayData.ts`
- **Lines 151-169**: Replace `phorest_daily_sales_summary` query with `phorest_transaction_items` filtered by `stylist_user_id = user.id` and date range. Aggregate same way.

---

## P1 — Visible to Users

### File 4: `src/hooks/useSalesData.ts`
- **Lines 112-114** (`useDailySalesSummary`): Switch to `phorest_transaction_items`, aggregate by date to produce daily totals.
- **Lines 164-187** (`useUserSalesSummary`): Replace summary query + fallback with `phorest_transaction_items` by `stylist_user_id`, with `phorest_staff_id` fallback. Add pagination.

### File 5: `src/components/dashboard/sales/PerformanceTrendChart.tsx`
- **Lines 77-100**: Replace `phorest_daily_sales_summary` queries (primary + fallback) with `phorest_transaction_items` by `stylist_user_id` (primary) and `phorest_staff_id` (fallback). Group by week ranges client-side.

### File 6: `src/hooks/usePayrollAnalytics.ts`
- **Lines 70-77**: Replace sales query with `phorest_transaction_items`. Add pagination.
- **Lines 88-97**: Replace YTD revenue query similarly.

### File 7: `src/hooks/usePayrollForecasting.ts`
- **Lines 121-128**: Replace current period sales query with `phorest_transaction_items`.
- **Lines 144-151**: Replace last period sales query similarly.

---

## P2 — Secondary Analytics

### File 8: `src/hooks/useSalesComparison.ts`
- Replace both current and previous period queries with `phorest_transaction_items`. Add location filter and pagination.

### File 9: `src/hooks/useTodayActualRevenue.tsx`
- **Lines 97-153**: Flip logic — query `phorest_transaction_items` first (primary), remove summary-first approach. Keep realtime subscription on both tables.

### File 10: `src/hooks/useStylistLocationRevenue.ts`
- Replace both queries (aggregate + trend) with `phorest_transaction_items` by `stylist_user_id`, grouping by `location_id`.

### File 11: `src/hooks/useOrganizationAnalytics.ts`
- **Lines 159-164**: Replace 60-day sales summary query with `phorest_transaction_items`.

---

## P3 — Modeling + Correlation

### File 12: `src/hooks/useCommissionEconomics.ts`
- **Lines 108-114**: Replace `appointments.total_price` with `phorest_transaction_items` for revenue-by-level calculation.

### File 13: `src/hooks/useCorrelationAnalysis.ts`
- Replace `phorest_daily_sales_summary` query with `phorest_transaction_items`, aggregate to daily totals client-side for correlation calculation.

### File 14: `src/lib/reportMetrics.ts`
- Update metric source definitions from `phorest_daily_sales_summary` to `phorest_transaction_items`.

---

## P3 — Edge Functions

### File 15: `supabase/functions/growth-forecasting/index.ts`
- Lines 192-194, 681-683: Replace `phorest_daily_sales_summary` queries with `phorest_transaction_items`.

### File 16: `supabase/functions/revenue-forecasting/index.ts`
- Line 73: Same replacement.

### File 17: `supabase/functions/detect-anomalies/index.ts`
- Lines 120, 135: Replace daily lookups with transaction item queries for today/last-week.

### File 18: `supabase/functions/calculate-org-benchmarks/index.ts`
- Line 74: Replace revenue query.

### File 19: `supabase/functions/process-scheduled-reports/index.ts`
- Lines 221, 247: Replace report data queries.

---

## Pattern (Applied Consistently)

All hooks use:
```text
fetchAllBatched with pageSize=1000
Revenue = total_amount + tax_amount
Split by item_type === 'service' (service) vs other (product)
Avg Ticket denominator = unique client_id + date
Filter by stylist_user_id (primary), phorest_staff_id (fallback)
Location scoping via location_id
```

## Files Changed

| Priority | File | Change |
|---|---|---|
| P0 | `useTeamLevelProgress.ts` | Sales query + computeMetrics + avgTicket + revPerHour |
| P0 | `usePayrollCalculations.ts` | `usePayrollSalesData` query |
| P0 | `useMyPayData.ts` | Sales data query |
| P1 | `useSalesData.ts` | `useDailySalesSummary` + `useUserSalesSummary` |
| P1 | `PerformanceTrendChart.tsx` | Trend data query |
| P1 | `usePayrollAnalytics.ts` | Period sales + YTD revenue |
| P1 | `usePayrollForecasting.ts` | Current + last period sales |
| P2 | `useSalesComparison.ts` | PoP comparison queries |
| P2 | `useTodayActualRevenue.tsx` | Flip to transaction-first |
| P2 | `useStylistLocationRevenue.ts` | Location breakdown queries |
| P2 | `useOrganizationAnalytics.ts` | Platform analytics sales |
| P3 | `useCommissionEconomics.ts` | Revenue-by-level from transactions |
| P3 | `useCorrelationAnalysis.ts` | Correlation data source |
| P3 | `reportMetrics.ts` | Metric source definitions |
| P3 | 5 edge functions | Backend query updates |

19 files, no database changes.

