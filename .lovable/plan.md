

## Root Cause

The previous fix only partially worked. Here's what's broken and why:

**Problem 1: Services = $0, Retail = $0 (the two sub-cards)**
In `useTodayActualRevenue.ts` lines 203-204, `actualServiceRevenue` and `actualProductRevenue` ALWAYS come from the POS summary table (`phorest_daily_sales_summary`), which has zero rows for today. The fallback to completed appointments only computes `actualRevenue` (total) but never assigns it to service vs product. So even though the hero shows $2,268, the breakdown shows $0/$0.

**Problem 2: Top Performers = "No sales data available"**
`useSalesByStylist` queries `phorest_transaction_items` exclusively. Today has 0 transaction items. No fallback exists to completed appointments.

**Problem 3: Revenue Breakdown donut = "No data"**
Same as Problem 1 -- it reads `todayActual.actualServiceRevenue` (0) and `todayActual.actualProductRevenue` (0).

### Database Evidence
- `phorest_daily_sales_summary` for today: **0 rows**
- `phorest_transaction_items` for today: **0 rows**
- `phorest_appointments` for today: **18 completed** ($2,268), **4 booked** ($768)

All three problems stem from missing fallback logic when POS line-item data hasn't synced yet.

---

## Fix Plan

### File 1: `src/hooks/useTodayActualRevenue.ts`
**Lines 201-204** -- When using the completed-appointments fallback (POS has no data), set:
- `actualServiceRevenue = completedData.totalRevenue` (all appointment revenue counts as services per user's choice)
- `actualProductRevenue = 0` (no line-item data to distinguish retail)

This is a 2-line change in the result construction block.

### File 2: `src/hooks/useSalesData.ts` -- `useSalesByStylist` function (lines 366-467)
Add a fallback path: when `phorest_transaction_items` returns 0 rows for the queried date range, re-query `phorest_appointments` where `status = 'completed'`, group by `phorest_staff_id`, and return stylist revenue from appointments. This enables the Top Performers leaderboard to work in real time even before POS transaction sync.

### No other file changes needed
- The Services/Retail sub-cards (AggregateSalesCard lines 814-862) already read `todayActual.actualServiceRevenue` and `todayActual.actualProductRevenue` -- they'll show correct values once File 1 is fixed.
- The Revenue Breakdown donut (line 1128-1131) reads the same fields -- will auto-fix.
- Transactions, Avg Ticket, Rev/Hour tiles already use `todayActual` correctly and show 18 / $126 / $76 as expected.

