

# Plan Verification: Fix Walk-in Labels and Client Name Resolution

## Bugs and Issues Found

### Bug 1: Duplicate return statement (line 559-561)
In `supabase/functions/sync-phorest-data/index.ts`, lines 559 and 561 both contain `return { total: allAppointments.length, synced };`. The second return is dead code. Not blocking, but the backfill code needs to be inserted **before** line 559 (before the first return), not between the two returns.

### Bug 2: Gap analysis missing `'booked'` status — confirmed
Line 112 of `useRevenueGapAnalysis.ts` filters with `.in('status', ['cancelled', 'no_show', 'completed', 'confirmed', 'pending', 'arrived', 'started'])`. The `'booked'` status is missing. Since the sync function maps most Phorest `ACTIVE` appointments to `'booked'` (then upgrades past ones to `'completed'`), any future-time booked appointments today are excluded from the gap analysis entirely.

### Bug 3: `is_walk_in` column does not exist yet
The plan correctly calls for adding it, but the migration must also update the `v_all_appointments` view to expose it. The current view (migration `20260408170436`) does not include this column. The plan accounts for this but worth confirming: the view must be `DROP`ped and recreated since Postgres doesn't allow `ALTER VIEW` to add columns.

### Bug 4: `useScheduledRevenue` does NOT subtract tips
The `useScheduledRevenue` hook (line 37) sums `expected_price || total_price` without subtracting `tip_amount`. This feeds `todayExpectedDisplay` (line 387 of AggregateSalesCard), which is the "Scheduled Services Today" number. The previous fix in `useAdjustedExpectedRevenue` correctly subtracts tips for `originalExpected`, but `scheduledRevenue` (used for past ranges and as fallback) still includes tips. The plan should address this for consistency.

### Inconsistency 1: `originalExpected` vs `scheduledRevenue` divergence
`todayExpectedDisplay` (line 387) uses `adjustedExpected?.originalExpected ?? scheduledRevenue`. After the tip fix, `originalExpected` excludes tips but `scheduledRevenue` still includes them. When `adjustedExpected` is null (loading state), the fallback shows the wrong number.

## Gap: View doesn't join `phorest_clients` for name resolution
The plan proposes adding a `COALESCE` join to `v_all_appointments` to resolve names from `phorest_clients`. This is the right approach for immediate resolution, but note: the `phorest_clients` table uses `phorest_client_id` as a text column, not a UUID FK. The LEFT JOIN must use `pa.phorest_client_id = pc.phorest_client_id` (string match). No schema issue, just confirming the join key.

## Revised Plan

### 1. Database Migration
- Add `is_walk_in BOOLEAN DEFAULT false` to `phorest_appointments`
- Recreate `v_all_appointments` with:
  - `COALESCE(pa.client_name, pc.name, NULLIF(TRIM(pc.first_name || ' ' || pc.last_name), ''))` as `client_name`
  - LEFT JOIN to `phorest_clients` on `phorest_client_id`
  - Expose `is_walk_in` column

### 2. Edge Function: Backfill client names post-sync
**File**: `supabase/functions/sync-phorest-data/index.ts`
- Insert backfill step **before line 559** (before the first return, remove the duplicate return on 561)
- Query `phorest_appointments` with null `client_name` + non-null `phorest_client_id`
- Batch-join against `phorest_clients` to resolve names
- Update `phorest_appointments.client_name` in bulk
- Set `is_walk_in = true` where `phorest_client_id IS NULL`

### 3. Add `'booked'` to gap analysis status filter
**File**: `src/hooks/useRevenueGapAnalysis.ts` (line 112)
- Add `'booked'` to the `.in('status', [...])` array

### 4. Fix `useScheduledRevenue` tip inclusion
**File**: `src/hooks/useRevenueGapAnalysis.ts` (line 23-37)
- Fetch `tip_amount` alongside `total_price` and `expected_price`
- Subtract `tip_amount` from the sum for consistency with `originalExpected`

### 5. Remove duplicate return statement
**File**: `supabase/functions/sync-phorest-data/index.ts` (line 561)
- Delete the dead `return` on line 561

## Summary

| Type | Count |
|------|-------|
| Migration | 1 (add column + recreate view with client name join) |
| Modified files | 2 (`sync-phorest-data/index.ts`, `useRevenueGapAnalysis.ts`) |
| Bugs found | 4 (duplicate return, missing booked status, no is_walk_in column, tips in scheduledRevenue) |
| Inconsistencies | 1 (originalExpected vs scheduledRevenue tip handling) |

