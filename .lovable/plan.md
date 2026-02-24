

## Data Gaps, Enhancements, and Contextual Clarity Audit

Great instinct to audit after the real-time revenue change -- that kind of structural self-review is exactly what keeps intelligence surfaces trustworthy. Here is what I found across the codebase:

---

### Critical Data Gap: `useSalesMetrics` Does Not Filter Out Cancelled/No-Show Appointments

**Severity: High**

The primary sales metrics hook (`useSalesMetrics` in `src/hooks/useSalesData.ts`) queries `phorest_appointments` but does **not** exclude cancelled or no-show appointments. It only filters `NOT total_price IS NULL`. Every other appointment query in the codebase correctly applies `.not('status', 'in', '("cancelled","no_show")')`.

This means:
- The hero "Total Revenue" (for non-today views) may include revenue from cancelled appointments
- Avg Ticket, Rev/Hour, transaction counts, and service hours are all inflated
- The leaderboard (`useSalesByStylist`) has the same missing filter
- The location breakdown (`useSalesByLocation`) also lacks this filter

**Fix:** Add `.not('status', 'in', '("cancelled","no_show")')` to the appointment queries in `useSalesMetrics`, `useSalesByStylist`, and `useSalesByLocation`.

---

### Data Source Inconsistency: Appointments vs Daily Sales Summary

**Severity: Medium**

Two different data sources are used for revenue across the dashboard:

| Surface | Source |
|---|---|
| Sales Overview hero, leaderboard, by-location | `phorest_appointments` (via `useSalesMetrics`) |
| Trend indicators, comparison badges | `phorest_daily_sales_summary` (via `useSalesComparison`) |
| Today actual revenue | `phorest_daily_sales_summary` (via `useTodayActualRevenue`) |
| Payroll calculations | `phorest_daily_sales_summary` |

When these two sources disagree (and they will -- summary is aggregated from checked-out transactions, appointments include all non-cancelled), the trend indicator can show a direction that contradicts the hero number. For example, summary shows +5% but appointments show -2%.

**Fix (contextual):** Add a subtle footnote or tooltip to the trend indicator clarifying "Trend based on completed transactions" when the hero metric uses a different source. Long-term, unify on one source.

---

### Donut Chart Uses Expected Revenue Even on Today View

**Severity: Low-Medium**

The `RevenueDonutChart` on line 1029-1036 always receives `displayMetrics.serviceRevenue` and `displayMetrics.productRevenue` (expected/scheduled amounts). On the today view, while the hero and sub-cards now correctly show **actual** revenue, the donut chart in the sidebar still shows the **expected** breakdown.

**Fix:** When `isToday && todayActual?.hasActualData`, pass `todayActual.actualServiceRevenue` and `todayActual.actualProductRevenue` to the donut chart.

---

### No-Show Rate Not Surfaced Anywhere

**Severity: Low**

The `useNoShowReport` hook exists and the data is tracked, but the Sales Overview card has no visibility into no-show rate for the selected period. For operators, no-shows directly erode the gap between expected and actual revenue. Surfacing "X% no-show rate" near the expected revenue badge would give immediate context for why actual might trail expected.

**Fix:** Add a small no-show rate indicator near the expected revenue badge on the today view, e.g., "3 no-shows (2.1%)" as a subtle text line.

---

### Today View: Location Rows Show Expected, Not Actual

**Severity: Medium**

The location breakdown rows (lines 1136-1347) always show `location.totalRevenue` from `useSalesByLocation`, which queries `phorest_appointments` (expected). On the today view, the `locationActuals` data is already fetched and available but only used in the "Status" tile of expanded location rows. The collapsed row's primary revenue number should show actual revenue when available.

**Fix:** When `isToday`, use `locationActuals[locId]?.actualRevenue` as the primary displayed value in the collapsed row, with the expected amount as secondary context.

---

### Missing "Last Updated" Timestamp on Today View

**Severity: Low**

The today actual revenue auto-refreshes every 5 minutes, but there is no indication to the operator of when the data was last fetched. An operator staring at the dashboard at 2:30 PM has no way to know if they're seeing data from 2:25 PM or 2:30 PM.

**Fix:** Add a subtle "Updated X min ago" timestamp below the progress bar, using the query's `dataUpdatedAt` from React Query.

---

### Discount Data Always Shows Zero

**Severity: Low**

`useSalesMetrics` hardcodes `totalDiscounts: 0` (line 318). The `phorest_daily_sales_summary` table has a `total_discounts` column that is populated. This means any discount-related analytics would show nothing.

**Fix:** Query `total_discounts` from `phorest_daily_sales_summary` when available, or calculate from transaction items. This becomes important when operators want to understand margin erosion.

---

### Row Limit Risk on High-Volume Days

**Severity: Medium**

`useSalesMetrics` does not paginate its appointment query. The default Supabase limit is 1,000 rows. A busy multi-location operation with 1,000+ appointments in a 30-day window would silently truncate results, underreporting revenue.

Other hooks (like `useRebookingRate`, `useOperationalAnalytics`) correctly implement pagination. `useSalesMetrics`, `useSalesByStylist`, and `useSalesByLocation` do not.

**Fix:** Add batch-fetching to these three hooks using the `fetchAllBatched` pattern already established in `useOperationalAnalytics`.

---

### Summary of Proposed Changes

| Priority | Issue | File(s) |
|---|---|---|
| **P0** | Add cancelled/no-show filter to `useSalesMetrics`, `useSalesByStylist`, `useSalesByLocation` | `src/hooks/useSalesData.ts` |
| **P0** | Add pagination to same three hooks (1,000-row limit risk) | `src/hooks/useSalesData.ts` |
| **P1** | Pass actual revenue to donut chart on today view | `src/components/dashboard/AggregateSalesCard.tsx` |
| **P1** | Show actual revenue in location rows on today view | `src/components/dashboard/AggregateSalesCard.tsx` |
| **P2** | Add "Updated X min ago" to today view | `src/components/dashboard/AggregateSalesCard.tsx` |
| **P2** | Add no-show count/rate context near expected revenue badge | `src/components/dashboard/AggregateSalesCard.tsx`, new query |
| **P2** | Add tooltip clarifying trend data source vs hero data source | `src/components/dashboard/AggregateSalesCard.tsx` |
| **P3** | Surface discount totals from `phorest_daily_sales_summary` | `src/hooks/useSalesData.ts` |

### Technical Sequence

1. Fix `useSalesData.ts` -- add status filter + pagination to all three hooks
2. Fix `AggregateSalesCard.tsx` -- donut chart actual data, location row actual data, "updated" timestamp
3. Add no-show rate context (requires small query addition to `useTodayActualRevenue` or new hook)
4. Add trend source tooltip clarification

