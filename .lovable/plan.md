

## Problem

The Top Performers toggle labels say "Revenue" / "Retail" but should say "Service" / "Retail" to clearly separate the two revenue categories.

## Plan

**File: `src/components/dashboard/sales/TopPerformersCard.tsx`**

1. Rename `SortMode` type from `'totalRevenue' | 'retail'` to `'service' | 'retail'`
2. Update `SORT_OPTIONS` labels: `"Service"` and `"Retail"`
3. Update `FilterTabsTrigger` values to `"service"` / `"retail"`
4. Update default state from `'totalRevenue'` to `'service'`
5. Update sorting logic: when mode is `'service'`, sort by `serviceRevenue` (calculated as `totalRevenue - productRevenue`)
6. Update `displayValue` calculation: when mode is `'service'`, show `serviceRevenue`; when `'retail'`, show `productRevenue`
7. Update `totalTeamRevenue` to sum the correct field per mode
8. Update share label text: "of total service" / "of total retail"
9. Hide the service/retail split subtitle when in either mode (it's redundant — only show it if we ever restore a "total" view)

