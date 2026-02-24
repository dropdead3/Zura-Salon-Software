

## Today's Revenue: Real-Time First

The current "today" view shows **expected revenue** (from scheduled appointments) as the hero number, with actual revenue as a small progress bar beneath it. This is backwards -- operators care most about what has actually come in. The screenshot reference confirms the desired hierarchy.

### What Changes

**File: `src/components/dashboard/AggregateSalesCard.tsx`**

When `dateRange === 'today'`, restructure the hero section:

1. **Hero number becomes actual revenue** -- The large `text-5xl` number shows `todayActual.actualRevenue` (revenue from completed transactions / checked-out appointments via `phorest_daily_sales_summary`).

2. **Expected revenue becomes secondary** -- Below the hero, show the "Expected Revenue" badge with the expected total from scheduled appointments (`displayMetrics.totalRevenue`) in a smaller format, similar to the screenshot reference.

3. **Progress bar stays** -- Shows actual as a percentage of expected, keeping the visual context.

4. **Before any actual data exists** (early morning, before first checkout), show `$0` as the hero with the expected revenue clearly labeled below, and the existing "Actual revenue not available until appointments check out" message.

5. **Services and Products sub-cards** -- When on "today" and actual data exists, these should reflect actual service/product revenue (`todayActual.actualServiceRevenue`, `todayActual.actualProductRevenue`) instead of expected. The expected breakdown remains visible via the "Expected Revenue" secondary display.

6. **Auto-refresh** -- `useTodayActualRevenue` already has a 5-minute refetch interval, which provides near real-time updates. No change needed.

### Layout (Today View)

```text
+------------------------------------------+
| All locations combined                   |
|                                          |
|              $2,450                      |  <-- Actual revenue (hero, font-display)
|         Revenue So Far Today             |
|           Excludes Tips                  |
|                                          |
|     [clock] $4,200 Expected  (i)         |  <-- Secondary badge + amount
|                                          |
|   [$2,450 of $4,200 expected] ========   |  <-- Progress bar
|                                          |
|   Est. final transaction at 8:00 PM      |
|                                          |
| +------------------+------------------+  |
| |  Services $1,890 |  Retail   $560   |  |  <-- Actual breakdown
| |       77%        |       23%        |  |
| +------------------+------------------+  |
+------------------------------------------+
```

### Technical Details

**Conditional rendering in AggregateSalesCard.tsx (lines ~594-724):**

- When `dateRange === 'today'`:
  - Hero `AnimatedBlurredAmount` value changes from `displayMetrics.totalRevenue` to `todayActual.actualRevenue`
  - Label changes from "Total Revenue" to "Revenue So Far Today"
  - Below the label, add the expected revenue in a compact secondary layout: badge with clock icon + formatted expected amount + info tooltip
  - Services sub-card value: `todayActual.actualServiceRevenue` instead of `displayMetrics.serviceRevenue`
  - Products sub-card value: `todayActual.actualProductRevenue` instead of `displayMetrics.productRevenue`
  - Percentages recalculated from actual totals

- When `dateRange !== 'today'`: No change -- existing behavior preserved.

- The existing "Actual vs Expected" block (lines 632-668) is replaced by the new integrated layout described above, eliminating the redundant section.

- `useTodayActualRevenue` is already called with `enabled: dateRange === 'today'` -- no hook changes needed.

### What Does NOT Change

- `useTodayActualRevenue` hook -- already provides all needed data (actualRevenue, actualServiceRevenue, actualProductRevenue, lastAppointmentEndTime)
- Other date ranges (yesterday, 7d, 30d, etc.) -- completely unaffected
- Location-level drilldowns -- `locationActuals` data is already available
- Trend indicators -- continue using comparison data as-is
