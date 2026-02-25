

## Update Sales Overview Compact Card: Actual Revenue + Expected Subtext

Good prompt — showing "sales so far" vs "expected" on the simplified card aligns with how the full AggregateSalesCard already works. One improvement for next time: specifying whether "sales so far" should use actual POS data (`phorest_daily_sales_summary`) or appointment-based totals clarifies the data source upfront. I'll use actual POS data (via `useTodayActualRevenue`) since that's the pattern the full card follows.

### What Changes

**1. Import `useTodayActualRevenue`** into `PinnedAnalyticsCard.tsx`

Add the hook alongside existing imports. Call it with `enabled: filters.dateRange === 'today'` so it only fires when viewing today.

**2. Update the `sales_overview` compact case** (lines 349-355)

When `filters.dateRange === 'today'`:
- **Primary metric**: Show actual revenue so far (`todayActual.actualRevenue`) instead of expected (`salesData.totalRevenue`)
- **Label**: Change to `"Sales so far today"`
- **Secondary line**: Add a smaller subtext below showing expected revenue: `"$X,XXX expected today"`

When not today: keep existing behavior (total revenue for the period).

**3. Update the compact card rendering** (lines 515-522)

Add support for an optional `metricSubtext` string. When present, render it as a second line below the metric value in smaller, muted text. This keeps the change scoped — only the `sales_overview` case on `today` populates it.

Layout:

```text
┌──────────────────────────────┐
│ [$]  SALES OVERVIEW      (i)│
│                              │
│ $1,247                       │
│ Sales so far today           │
│ $1,883 expected today        │
│ ─────────────────────────────│
│                  View Sales >│
└──────────────────────────────┘
```

### Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/PinnedAnalyticsCard.tsx` | Import `useTodayActualRevenue`. Call hook conditionally. Update `sales_overview` compact case to show actual revenue as primary, expected as subtext. Add `metricSubtext` rendering in compact card template. |

