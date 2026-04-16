

# Fix: Phorest Breaks Fetched but Not Inserted (0 Upserted)

## Root Cause Analysis

The edge function logs confirm the Break API is now working — **37 breaks are fetched** across 2 branches. But **0 are upserted**. There are two issues:

### Issue 1: Silent Skip — Missing Staff Mapping
The `syncRoster` function skips any break where the `staffId` isn't found in `phorest_staff_mapping` (line 1921: `if (!orgId) continue`). There's **no debug logging** to reveal how many breaks are skipped or why, making this impossible to diagnose from logs alone.

### Issue 2: Partial Unique Index vs PostgREST Upsert
The `phorest_id` dedup index is a **partial unique index** (`WHERE phorest_id IS NOT NULL`). PostgREST's `upsert` with `onConflict: 'phorest_id'` may not recognize a partial index for conflict resolution, causing silent failures. This needs to be changed to a full unique constraint.

## Changes Required

### 1. Edge Function — Add Diagnostic Logging + Fix Upsert Strategy
**File**: `supabase/functions/sync-phorest-data/index.ts`

- Add logging to show: how many breaks had missing fields, how many had unmapped staff, which staffIds were unmapped
- Log the first break object from the API to verify field names
- Change upsert strategy: instead of `onConflict: 'phorest_id'`, delete existing phorest-sourced blocks for the date range first, then insert fresh — this avoids the partial index problem entirely

### 2. Database Migration — Replace Partial Index with Full Unique Constraint
**New migration SQL**:
- Drop the partial unique index
- Add a proper unique constraint on `phorest_id` (nullable column, but the constraint only fires on non-null values by default in PostgreSQL — actually no, we need to ensure it works). Alternative: keep delete-then-insert strategy which doesn't need the conflict clause at all.

## Recommended Approach: Delete + Insert (Simplest Fix)

Rather than fighting PostgREST's partial index limitations:

1. Before inserting breaks for a branch+date range, delete existing `source = 'phorest'` blocks for that branch and date range
2. Insert the new blocks fresh
3. This is idempotent and avoids all upsert/constraint issues

## Implementation Summary

| Step | File | Change |
|------|------|--------|
| 1 | `sync-phorest-data/index.ts` | Add debug logging (log first break object, count skipped-by-field, count skipped-by-mapping, list unmapped staffIds) |
| 2 | `sync-phorest-data/index.ts` | Replace upsert with delete-then-insert for the date range |
| 3 | Deploy + test | Trigger sync, check logs for diagnostic output |

