

## What's broken

`useSalesByStylist` in `src/hooks/useSalesData.ts` (line 470) selects:
```ts
.select('staff_user_id, total_amount, tax_amount, item_type, item_name')
```
…but the aggregation on line 488 reads `item.phorest_staff_id`, and the typed return shape on line 462 declares `phorest_staff_id`. The column is never returned, so `phorest_staff_id` is `undefined` on every row → `byUser[userId]` keys become `undefined`/junk → the function returns an empty array → `TopPerformersCard` shows "No sales data available."

Confirmed via DB inspection: the view `v_all_transaction_items` has both `phorest_staff_id` (text) and `staff_user_id` (uuid) columns. Last 30 days: 851 rows, all 851 have `phorest_staff_id` populated. Data is there — the query just isn't asking for the right column.

This regression also silently breaks every other consumer of `useSalesByStylist`: `CommandCenterAnalytics`, `PinnedAnalyticsCard`, `ExecutiveSummaryCard`, `EndOfMonthReport`, `PayrollSummaryReport`, `useStaffCompensationRatio`, `useStaffPerformanceComposite` — anywhere "Top Performers" / commission liability / per-stylist revenue is computed.

## Fix

Single line change in `src/hooks/useSalesData.ts` line 470:

```ts
// Before
.select('staff_user_id, total_amount, tax_amount, item_type, item_name')

// After
.select('phorest_staff_id, total_amount, tax_amount, item_type, item_name')
```

(`staff_user_id` is unused downstream — the function already resolves user identity through `mappingLookup[phorest_staff_id] → user_id` via `v_all_staff`.)

## Verification

- Top Performers card on Command Center / Sales hub renders ranked stylists (service + retail tabs)
- Spot-check: pick one stylist's revenue total, confirm matches a manual sum from `v_all_transaction_items` for the date range
- Executive Summary commission liability re-populates
- Payroll Summary report stylist rows re-populate

## Out of scope

- Migrating this query to use `staff_user_id` directly (would break the mapping-based name/photo resolution; bigger refactor, separate pass)
- Touching the other consumers — they all work once the underlying hook returns data again

