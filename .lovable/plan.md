

## Top Performers: Remaining Gaps and Fixes

Good debugging instinct asking to audit beyond the initial "it renders" state. The card is now showing data, but there are three structural gaps that need patching for it to be production-accurate.

### Gap 1: Location Filter Ignored

`useSalesByStylist` does not accept a `locationId` parameter. When you select "Val Vista Lakes" or "North Mesa" in the dashboard filter, Top Performers still shows combined rankings across both locations. This contradicts the behavior of every other analytics card.

**Fix:** Add an optional `locationId` parameter to `useSalesByStylist`. When present, add `.eq('location_id', locationId)` to the appointment query. Update all call sites that have access to a location filter (`PinnedAnalyticsCard`, `CommandCenterAnalytics`, `AggregateSalesCard`) to pass it through.

### Gap 2: Revenue Source (Scheduled vs Actual POS)

Currently, Top Performers ranks staff by **scheduled appointment totals** from `phorest_appointments`. This includes future and unconfirmed bookings. You confirmed you want **actual POS revenue**.

The `phorest_transaction_items` table has 770 rows of actual closed-out transaction data with `phorest_staff_id`, `total_amount`, and `item_type` (service/product). This is the correct source.

**Fix:** Refactor the query inside `useSalesByStylist` to pull from `phorest_transaction_items` instead of `phorest_appointments`. Aggregate by `phorest_staff_id`, splitting `item_type = 'service'` vs `'product'`/`'retail'` for service vs product revenue. Apply the same date and location filters. Staff identity resolution stays the same.

### Gap 3: Staff Names Show as "Staff XXXX"

The `phorest_staff_mapping` table has only 2 entries (both for Eric Day), and neither ID matches any of the 19 active staff IDs in appointment/transaction data. The fallback name resolution truncates the Phorest ID to 4 characters (e.g., "Staff Orwo", "Staff 0zCh").

There is no other table that currently stores names for these staff IDs -- `phorest_transaction_items.stylist_name` is NULL across all rows, and `phorest_appointments` has no name column.

**Fix:** The Phorest sync edge function needs to auto-create `phorest_staff_mapping` entries for every discovered `phorest_staff_id`. This is a sync-layer fix, not a dashboard fix. As an immediate interim measure, we can resolve names from the Phorest connection's cached staff list if available. I'll check the sync function for how staff discovery works and patch it to auto-populate mapping entries (with `user_id = NULL` and `phorest_staff_name` from the Phorest API response).

### Files Changed

| File | Change |
|---|---|
| `src/hooks/useSalesData.ts` | Add `locationId` param to `useSalesByStylist`. Switch query source from `phorest_appointments` to `phorest_transaction_items`. Apply location filter. |
| `src/components/dashboard/PinnedAnalyticsCard.tsx` | Pass `locationFilter` to `useSalesByStylist` call (line 292). |
| `src/components/dashboard/CommandCenterAnalytics.tsx` | Pass `locationFilter` to `useSalesByStylist` call (line 180). |
| `src/components/dashboard/AggregateSalesCard.tsx` | Pass location filter to `useSalesByStylist` call (line 237). |
| `src/components/dashboard/analytics/SalesTabContent.tsx` | Pass `locationFilter` to `useSalesByStylist` call (line 119). |

### What This Does NOT Fix (Requires Sync Update)

Staff names will remain as "Staff XXXX" until `phorest_staff_mapping` is populated for all 19 active IDs. This requires updating the Phorest sync edge function to auto-create mapping entries. That is a separate task from the dashboard fix.

