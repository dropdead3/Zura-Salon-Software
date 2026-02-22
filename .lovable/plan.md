

# Extend Duplicate Detection to Phorest Client Sync

## Problem

The `phorest_clients` table has no deduplication during import. Each Phorest record gets its own row keyed by `phorest_client_id`. If Phorest has two records for "Eric Day" with the same phone but different `phorest_client_id` values, both are imported as separate rows -- creating visible duplicates in the Client Directory.

The existing `find_duplicate_clients` function and `normalize_client_identity` trigger only operate on the `clients` table, not `phorest_clients`.

## Solution

Add normalized identity columns and a deduplication merge step to the `phorest_clients` table, plus detect duplicates during sync.

### 1. Database Migration -- Add normalized columns to `phorest_clients`

Add `email_normalized`, `phone_normalized`, and `canonical_client_id` columns to `phorest_clients`:

- `email_normalized` (text, nullable) -- lowercase/trimmed email
- `phone_normalized` (text, nullable) -- digits-only, +1-prefixed phone
- `canonical_client_id` (uuid, nullable, self-referencing FK) -- points to the "primary" phorest_client row when duplicates are detected; NULL means this IS the canonical record
- `is_duplicate` (boolean, default false) -- marks rows that have been identified as duplicates of another

Create a trigger `normalize_phorest_client_identity` (mirroring the existing `normalize_client_identity` trigger on `clients`) that auto-populates `email_normalized` and `phone_normalized` on INSERT/UPDATE.

Create a unique partial index on `(phone_normalized)` where `is_duplicate = false AND phone_normalized IS NOT NULL` to prevent future duplicates from being inserted without merging.

### 2. Backfill existing data

Run a one-time UPDATE to populate `email_normalized` and `phone_normalized` for all existing `phorest_clients` rows using the same normalization logic.

### 3. Database Function -- `find_duplicate_phorest_clients`

Create a function similar to `find_duplicate_clients` but operating on `phorest_clients`:

```
find_duplicate_phorest_clients(
  p_email text,
  p_phone text,
  p_exclude_phorest_client_id text
) RETURNS TABLE(...)
```

This checks `email_normalized` and `phone_normalized` for matches, excluding the current record.

### 4. Edge Function Changes -- `sync-phorest-data`

In the client sync loop (around line 548), after building `clientRecord` but before upserting:

1. Normalize email/phone using the same logic
2. Call `find_duplicate_phorest_clients` with the normalized values
3. If a match is found:
   - Still upsert the record (preserving the Phorest data)
   - Set `canonical_client_id` to point to the existing match's `id`
   - Set `is_duplicate = true`
   - Log the detected duplicate for admin review
4. If no match, upsert normally with `is_duplicate = false`

### 5. Edge Function Changes -- `create-phorest-client`

Before inserting a new client, query `phorest_clients` for matching `email_normalized` or `phone_normalized`. If found, return the existing client instead of creating a duplicate (or flag appropriately).

### 6. UI Query Changes -- Filter out duplicates

In all places that query `phorest_clients` for display (Client Directory, search dropdowns, booking flows), add `.eq('is_duplicate', false)` to exclude duplicate rows. The canonical record remains visible.

### 7. Admin Duplicate Review Surface (lightweight)

Add a notification or badge on the existing Merge Clients page showing auto-detected duplicates from sync, allowing admins to confirm or override the automatic dedup decisions.

## Immediate Data Fix

Delete or merge the duplicate Eric Day record. Since both have the same phone (`14805430240`) but different emails, the one with the non-business email should be merged into the primary.

## File Summary

| Action | File/Location |
|--------|---------------|
| Migration | Add `email_normalized`, `phone_normalized`, `canonical_client_id`, `is_duplicate` columns to `phorest_clients` |
| Migration | Create `normalize_phorest_client_identity` trigger |
| Migration | Create `find_duplicate_phorest_clients` function |
| Migration | Backfill normalized values for existing rows |
| Modify | `supabase/functions/sync-phorest-data/index.ts` -- dedup check during client sync |
| Modify | `supabase/functions/create-phorest-client/index.ts` -- dedup check before insert |
| Modify | Client Directory and booking search queries -- filter `is_duplicate = false` |

## Technical Notes

- The `phorest_client_id` upsert remains intact -- we never lose Phorest data
- Duplicate rows are preserved but flagged, so analytics and audit trails stay accurate
- The `canonical_client_id` creates a soft merge without deleting data
- Phone normalization uses the same logic as the existing `normalize_client_identity` function on the `clients` table

