

## Fix: Sales Overview Card -- Show "So Far Today" Actuals for All Metrics

### Problem
The hero revenue correctly shows actual sales ($2,268 from 18 completed appointments), but the secondary KPI tiles (Transactions: 12, Avg Ticket: $253, Rev/Hour: $81) pull from `useSalesMetrics` which includes ALL appointments (booked + completed = 22 total). The user wants these to reflect only completed/actual sales so far today.

### Root Cause
1. `useTodayActualRevenue` only queries `phorest_daily_sales_summary` which has no data for today -- it needs a fallback to completed appointments
2. The hook doesn't expose `actualServiceHours` for Rev/Hour calculation
3. `AggregateSalesCard` uses `displayMetrics` (all appointments) for the KPI tiles even when `isToday`

### Changes

**File 1: `src/hooks/useTodayActualRevenue.ts`**
- Add a fallback query to `phorest_appointments` where `status = 'completed'` when `phorest_daily_sales_summary` has no rows
- Compute revenue, transactions, and service hours from completed appointments
- Add `actualServiceHours` to the returned data interface
- Add `actualAverageTicket` (derived: actualRevenue / actualTransactions)

**File 2: `src/components/dashboard/AggregateSalesCard.tsx`**
- When `isToday && todayActual?.hasActualData`:
  - Transactions tile: show `todayActual.actualTransactions` instead of `displayMetrics.totalTransactions`
  - Avg Ticket tile: show `todayActual.actualAverageTicket` instead of `displayMetrics.averageTicket`
  - Rev/Hour tile: compute from `todayActual.actualRevenue / todayActual.actualServiceHours` instead of `revenuePerHour`
- This applies to both the single-day layout (lines 880-943) and the multi-day layout (lines 946-1010)

### Data Flow
```text
Today filter active:
  phorest_daily_sales_summary → has rows? → use POS data
                               → empty?   → query phorest_appointments WHERE status='completed'
                                            → sum total_price, count rows, sum service hours
                                            → return as "actual" metrics
```

### Expected Result
- Transactions: 18 (completed only, not 22)
- Avg Ticket: ~$126 ($2,268 / 18)
- Rev/Hour: computed from completed appointment hours only
- Labels remain "so far today" context

