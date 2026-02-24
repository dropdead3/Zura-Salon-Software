

## Add "Expected Revenue" Clarity to Simple Sales Overview Card

Good catch -- the compact Sales Overview card on the dashboard home currently labels its figure as "Total revenue across all services and retail for today," which doesn't distinguish between actual (completed) and expected (scheduled). Since the full Sales Overview card already makes this distinction, the compact version should too.

### What Changes

**File:** `src/components/dashboard/PinnedAnalyticsCard.tsx` (lines 348-352)

When the date filter is set to `today`, update the `sales_overview` case to:

1. Change the `metricLabel` from the generic "Total revenue across all services and retail for today" to **"Today's expected revenue across all services and retail"**
2. For non-today periods, keep the existing label pattern using `getPeriodLabel()`

### Technical Detail

In the compact card switch block (line 348-352):

```
// Before
case 'sales_overview':
  metricValue = formatCurrencyWhole(salesData?.totalRevenue ?? 0);
  metricLabel = `Total revenue across all services and retail for ${getPeriodLabel(filters.dateRange)}`;
  break;

// After
case 'sales_overview':
  metricValue = formatCurrencyWhole(salesData?.totalRevenue ?? 0);
  metricLabel = filters.dateRange === 'today'
    ? "Today's expected revenue across all services and retail"
    : `Total revenue across all services and retail for ${getPeriodLabel(filters.dateRange)}`;
  break;
```

### Scope

Single file, single line change. No new hooks, props, or data fetching required -- the value displayed ($1,640) is already the expected/scheduled total from `salesData.totalRevenue`.
