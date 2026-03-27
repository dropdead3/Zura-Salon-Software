

# Fix: Date Range Toggle Filters Not Working Correctly

## Bugs Found

### Bug 1: Missing `todayToEom` case in `getDateRange()`
The `getDateRange` function in `PinnedAnalyticsCard.tsx` has no `case 'todayToEom'`, so selecting "Today → End of Month" silently falls through to the default (last 30 days). The user sees incorrect data without any indication the filter failed.

### Bug 2: Duplicate `getDateRange` in `CommandCenterAnalytics.tsx`
A second copy of `getDateRange` exists in `CommandCenterAnalytics.tsx` (line 62) — also missing `todayToEom` and `todayToPayday`. Both should use the canonical version from `PinnedAnalyticsCard.tsx`.

### Bug 3: `lastMonth` incorrectly mapped in `mapToSalesDateRange`
`lastMonth` maps to `'30d'` in `mapToSalesDateRange` (line 114), so the Sales Overview card shows "last 30 rolling days" data instead of the actual previous calendar month when Last Month is selected.

## Fix

### 1. Add missing `todayToEom` case to canonical `getDateRange` (PinnedAnalyticsCard.tsx)

```tsx
case 'todayToEom':
  return {
    dateFrom: format(now, 'yyyy-MM-dd'),
    dateTo: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
```

### 2. Remove duplicate `getDateRange` from `CommandCenterAnalytics.tsx`
Import and use the canonical `getDateRange` from `PinnedAnalyticsCard.tsx` instead of the local copy.

### 3. Fix `lastMonth` mapping in `mapToSalesDateRange`
Map `'lastMonth'` to `'lastMonth'` (or add `'lastMonth'` to the `SalesDateRange` type if it doesn't exist yet) so the Sales Overview card queries the correct calendar month.

## Files Changed
- **Modified:** `src/components/dashboard/PinnedAnalyticsCard.tsx` — add `todayToEom` case, fix `lastMonth` mapping
- **Modified:** `src/components/dashboard/CommandCenterAnalytics.tsx` — remove duplicate `getDateRange`, import canonical version

