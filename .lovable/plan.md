

# Wire Phorest Staff Into Zura — Revised Plan

## Problem Summary

- **165 of 183** `phorest_daily_sales_summary` rows have NULL `user_id` (synced before staff mappings existed)
- **306 of 1917** `phorest_sales_transactions` / `phorest_transaction_items` rows missing `stylist_user_id`
- **22 of 23** active employee profiles have NULL `location_id`
- Alex Day is correctly Zura-only (admin, no Phorest mapping needed)

## Plan (4 steps)

### 1. Backfill `user_id` on Sales Tables (data update)

Use the insert tool to run UPDATE statements that resolve `user_id` from existing `phorest_staff_mapping`:

```sql
-- Daily sales summaries
UPDATE phorest_daily_sales_summary pds
SET user_id = psm.user_id
FROM phorest_staff_mapping psm
WHERE pds.phorest_staff_id = psm.phorest_staff_id
  AND psm.is_active = true AND pds.user_id IS NULL;

-- Sales transactions
UPDATE phorest_sales_transactions pst
SET stylist_user_id = psm.user_id
FROM phorest_staff_mapping psm
WHERE pst.phorest_staff_id = psm.phorest_staff_id
  AND psm.is_active = true AND pst.stylist_user_id IS NULL;

-- Transaction items
UPDATE phorest_transaction_items pti
SET stylist_user_id = psm.user_id
FROM phorest_staff_mapping psm
WHERE pti.phorest_staff_id = psm.phorest_staff_id
  AND psm.is_active = true AND pti.stylist_user_id IS NULL;
```

### 2. Backfill `location_id` on Employee Profiles (data update)

Map branch IDs to location IDs using the known mapping:
- `hYztERWvOdMpLUcvRSNbSA` → `north-mesa`
- `6YPlWL5os-Fnj0MmifbvVA` → `val-vista-lakes`

For multi-branch staff, use the most recent mapping. Skip Alex Day (no mapping = no location needed for admin).

### 3. Fix `useUserSalesSummary` — Phorest Staff ID Fallback

**File: `src/hooks/useSalesData.ts`**

Currently queries `phorest_daily_sales_summary` by `user_id` only. Add a fallback: first resolve the user's `phorest_staff_id(s)` via `phorest_staff_mapping`, then query by **both** `user_id` OR `phorest_staff_id IN (...)`. This makes the hook resilient to future syncs that miss `user_id`.

### 4. Fix `PerformanceTrendChart` — Same Fallback

**File: `src/components/dashboard/sales/PerformanceTrendChart.tsx`**

Same pattern: resolve phorest staff IDs for the user, then query summaries using both `user_id` and `phorest_staff_id` match.

## What This Fixes

After these changes, all 22 mapped team members will immediately show:
- Revenue on Team Stats (weekly/monthly)
- Performance Trend Chart (8-week history)
- Location-scoped analytics across all hub pages
- Staff Performance Report economics columns

## Files Changed

| File | Change |
|---|---|
| Data update (insert tool) | Backfill `user_id` on 3 sales tables + `location_id` on employee profiles |
| `src/hooks/useSalesData.ts` | `useUserSalesSummary` adds phorest_staff_id fallback query |
| `src/components/dashboard/sales/PerformanceTrendChart.tsx` | Same fallback pattern for trend data |

## Not Needed

- **Alex Day**: Correctly admin-only, no Phorest mapping required
- **Auto-mapping hook**: All 22 service staff already have valid mappings
- **Mapping health UI**: Not needed since mappings are complete
- **Sync function fix**: The sync already includes `user_id` — the issue was timing (mappings created after initial sync). A re-sync would also fix this, but the backfill is faster and more reliable.

