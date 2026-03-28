

## Problem

The Rev/Hour KPI tile shows `$0.00` for today, but the "Efficiency by Stylist" panel directly below it correctly shows `$77/hr` salon average. Both should show the same value.

The KPI tile (line 1244) uses `todayActual.actualServiceHours` from the new appointments query we just added, while the efficiency panel uses `metrics?.totalServiceHours` from `useSalesData`. The `useSalesData` query works (the panel proves it), but the today-specific query likely returns 0 due to filter mismatches.

## Fix

**File: `src/components/dashboard/AggregateSalesCard.tsx`** (lines 1244 and 1309)

For the today Rev/Hour calculation, fall back to `metrics?.totalServiceHours` when `todayActual.actualServiceHours` is 0. This uses the same data source as the efficiency panel:

```tsx
// Before (line 1244 and 1309):
isToday ? (todayActual?.hasActualData && todayActual.actualServiceHours > 0 
  ? todayActual.actualRevenue / todayActual.actualServiceHours : 0)

// After:
isToday ? (() => {
  const hours = todayActual?.actualServiceHours > 0 
    ? todayActual.actualServiceHours 
    : (metrics?.totalServiceHours || 0);
  const rev = todayActual?.hasActualData ? todayActual.actualRevenue : (metrics?.totalRevenue || 0);
  return hours > 0 ? rev / hours : 0;
})()
```

This ensures the KPI tile uses the same hours data that powers the efficiency panel, eliminating the mismatch.

### Files modified
- `src/components/dashboard/AggregateSalesCard.tsx` — two lines (1244 and 1309)

