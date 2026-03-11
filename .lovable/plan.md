

## Fix: Sales Overview Data Source Mismatch for Non-Today Ranges

### Problem Found

When the "Last 7 Days" (or any non-today past range) filter is active, the Sales Overview card mixes two incompatible data sources:

| Metric | Data Source | Value (screenshot) |
|--------|-----------|-------------------|
| **Total Revenue (hero)** | POS actual (`useActualRevenue` → `phorest_daily_sales_summary`) | $24,104.46 |
| **Services breakdown** | Appointments (`useSalesMetrics` → `phorest_appointments`) | $25,291.92 |
| **Retail breakdown** | Transactions (`useSalesMetrics` → `phorest_transaction_items`) | $4,057.58 |
| **Transactions / Avg Ticket** | Appointments (`useSalesMetrics`) | 125 / $235.00 |

Services ($25,291.92) + Retail ($4,057.58) = $29,349.50, which matches the "Scheduled" badge but NOT the hero Total Revenue ($24,104.46). This is because the hero was updated to use POS actuals for past ranges, but the sub-cards were not.

### Fix (1 file)

**`src/components/dashboard/AggregateSalesCard.tsx`**

When `isPastRange && pastActual?.hasActualData`, use `pastActual` values consistently for ALL metrics:

1. **Services/Retail sub-cards** (lines ~925-930): Use `pastActual.actualServiceRevenue` / `pastActual.actualProductRevenue` instead of `displayMetrics.serviceRevenue` / `displayMetrics.productRevenue`

2. **Transactions** (lines ~1008, 1073): Use `pastActual.actualTransactions` instead of `displayMetrics.totalTransactions`

3. **Avg Ticket** (lines ~1027, 1092): Compute from `pastActual.actualRevenue / pastActual.actualTransactions` instead of `displayMetrics.averageTicket`

4. **Rev/Hour** (line ~1046, 1111): Use `pastActual.actualRevenue / metrics.totalServiceHours` (service hours still come from appointments since POS doesn't track duration)

5. **Daily Avg** (line ~989): Use `pastActual.actualRevenue / workingDays` instead of `displayMetrics.totalRevenue / workingDays`

This ensures all displayed numbers derive from the same POS source when actual data is available, eliminating the arithmetic inconsistency.

