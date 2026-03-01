

## Show Expected Revenue Badge on Past Date Ranges + Gap Analysis Drill-Down

### Current State

- **Today view:** Shows actual POS revenue as the hero number, with an "Expected" badge (from appointment data) below it, plus actual vs expected progress bar
- **Past date views (Yesterday, 7d, MTD, etc.):** Shows appointment-based revenue as the hero number but calls it "Total Revenue" — no distinction between expected and actual. The "Expected" badge is hidden (`isToday` guard at line 680)
- `useTodayActualRevenue` only fetches POS data for today's date — it's hardcoded to `format(new Date(), 'yyyy-MM-dd')`

### What Needs to Change

#### 1. New hook: `useActualRevenue` (generalized)

Create `src/hooks/useActualRevenue.ts` — a generalized version of `useTodayActualRevenue` that accepts `dateFrom` and `dateTo` parameters instead of hardcoding today. It queries `phorest_daily_sales_summary` for the date range, with a fallback to `phorest_transaction_items`. Returns actual POS revenue, service/product split, and transaction count.

#### 2. New hook: `useRevenueGapAnalysis`

Create `src/hooks/useRevenueGapAnalysis.ts` that, given a date range, fetches:
- **Cancelled appointments** with their `total_price` (status = 'cancelled')
- **No-show appointments** with their `total_price` (status = 'no_show')
- **Completed appointments** count and revenue for context

Returns a structured gap analysis:
```typescript
{
  expectedRevenue: number;       // from appointments (non-cancelled, non-no-show)
  actualRevenue: number;         // from POS data
  gapAmount: number;             // expected - actual
  gapPercent: number;
  cancellations: { count: number; lostRevenue: number };
  noShows: { count: number; lostRevenue: number };
  unexplainedGap: number;        // remaining gap after cancellations + no-shows
}
```

#### 3. Update `AggregateSalesCard.tsx`

**For past single-day views (yesterday):**
- Swap the hero number to show actual POS revenue (from the new `useActualRevenue` hook) as the primary display
- Show the "Expected" badge below with the appointment-based revenue (from `displayMetrics.totalRevenue`)
- If actual < expected, show an amber badge; if actual >= expected, show a green "Exceeded" badge (reuse existing pattern from today view)

**For past multi-day views (7d, MTD, YTD, etc.):**
- Show actual POS revenue as the hero number
- Show expected (appointment-based) revenue as a secondary badge
- Same exceeded/behind logic

**For all past views:**
- Make the expected badge clickable to open a gap analysis drill-down panel

#### 4. New component: `RevenueGapDrilldown`

Create `src/components/dashboard/sales/RevenueGapDrilldown.tsx` — a collapsible panel (using the existing `activeDrilldown` pattern) that renders when the user clicks the expected revenue badge. Shows:

- **Summary bar:** Expected vs Actual with a progress indicator
- **Gap breakdown:**
  - Cancellations: X appointments, $Y lost revenue
  - No-shows: X appointments, $Y lost revenue
  - Unexplained variance: $Z (pricing differences, discounts, add-ons)
- **Insight text:** A calm, advisory sentence (e.g., "Cancellations accounted for 65% of the revenue gap this period")

All monetary values wrapped in `BlurredAmount`. Uses `font-display` for headings, `font-sans` for body. Follows the existing drill-down animation pattern with `AnimatePresence` + `motion.div`.

### Files to Create
| File | Purpose |
|---|---|
| `src/hooks/useActualRevenue.ts` | Generalized POS revenue hook for any date range |
| `src/hooks/useRevenueGapAnalysis.ts` | Cancellation/no-show gap analysis for a date range |
| `src/components/dashboard/sales/RevenueGapDrilldown.tsx` | Drill-down panel explaining the revenue gap |

### Files to Modify
| File | Change |
|---|---|
| `src/components/dashboard/AggregateSalesCard.tsx` | Remove `isToday` guard on expected badge, wire up `useActualRevenue` for past dates, add gap drill-down trigger, integrate `RevenueGapDrilldown` component |

### Technical Details

- `useActualRevenue` will be enabled for all non-future date ranges (`dateRange !== 'todayToEom'`)
- The hook uses the same `phorest_daily_sales_summary` → `phorest_transaction_items` fallback pattern as `useTodayActualRevenue`
- For today specifically, we continue using `useTodayActualRevenue` (which has realtime subscriptions)
- The gap drill-down reuses the `activeDrilldown` state machine — clicking the expected badge sets `activeDrilldown = 'expectedGap'`
- `useRevenueGapAnalysis` is only fetched when the drill-down is open (lazy, via `enabled` flag)

