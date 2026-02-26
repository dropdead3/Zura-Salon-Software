

## Show gray donut when no actual POS sales exist (today only)

**Root cause**: The `RevenueDonutChart` receives appointment-based (expected) revenue as a fallback when no POS data exists. Since appointments have service revenue, `total > 0` and the gray empty state never triggers.

**Fix**: When viewing today and no actual POS data is available, pass `0` for both service and product revenue so the donut renders as gray with 0% metrics. This signals "no sales recorded yet" visually.

### Change

**File: `src/components/dashboard/AggregateSalesCard.tsx` (lines 1133-1135)**

```tsx
// Before
<RevenueDonutChart
  serviceRevenue={isToday && todayActual?.hasActualData ? todayActual.actualServiceRevenue : displayMetrics.serviceRevenue} 
  productRevenue={isToday && todayActual?.hasActualData ? todayActual.actualProductRevenue : displayMetrics.productRevenue}

// After
<RevenueDonutChart
  serviceRevenue={isToday ? (todayActual?.hasActualData ? todayActual.actualServiceRevenue : 0) : displayMetrics.serviceRevenue} 
  productRevenue={isToday ? (todayActual?.hasActualData ? todayActual.actualProductRevenue : 0) : displayMetrics.productRevenue}
```

When viewing today with no POS data: both values = 0, triggering the gray donut with 0% metrics. When viewing past dates: appointment-based revenue displays as before.

### Files changed
- `src/components/dashboard/AggregateSalesCard.tsx` (2 lines)

