

## Fix: Sales Overview Compact Card Data Source

### Problem
The Sales Overview compact card shows "Today's expected revenue" ($3,036) instead of "Sales so far today" because `useTodayActualRevenue` only queries `phorest_daily_sales_summary`, which has no rows for today. The database confirms 18 completed appointments worth $2,268 and 4 booked worth $768 -- but the hook never sees them.

### Changes

**File 1: `src/hooks/useTodayActualRevenue.ts`**
- Add a fallback query to `phorest_appointments` for completed appointments when `phorest_daily_sales_summary` returns no data
- Query: sum `total_price` from today's appointments where `status = 'completed'` (these are confirmed sales)
- Set `hasActualData = true` when completed appointment revenue > 0, even without POS summary data
- This gives "sales so far" = $2,268 (completed) while the full $3,036 remains as "expected"

**File 2: `src/components/dashboard/PinnedAnalyticsCard.tsx`** (lines 356-366)
- Update the `sales_overview` compact case sublabel from `"$X expected today"` to `"$X expected in services today"` using `salesData?.serviceRevenue` instead of `totalRevenue`
- This matches the user's request: primary = actual sales so far, sublabel = expected service revenue

### Result
- Primary metric: "$2,268.00" with label "Sales so far today"
- Sublabel: "$3,036.00 expected in services today"
- When POS summary data exists (e.g., end of day sync), it takes priority over the appointment fallback

