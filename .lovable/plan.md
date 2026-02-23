

# Fix: Merge Wizard Cannot Find Both Duplicate Profiles

## Root Cause

There is a **table mismatch** between the Client Directory and the Merge Wizard:

| Surface | Table Used | Eric Day Records |
|---|---|---|
| Client Directory | `phorest_clients` | 2 (one canonical, one duplicate) |
| Merge Wizard search (`useClientSearch`) | `clients` | 1 |

The "Merge" button in the directory passes `phorest_clients` UUIDs in the URL, but the Merge Wizard's `ClientSelector` uses `useClientSearch` which queries the `clients` table. The IDs don't match, and only one record exists there.

## Fix

### 1. Create a dedicated `usePhorestClientSearch` hook (new function in `useClientsData.ts`)

Add a search hook that queries `phorest_clients` instead of `clients`, since that's the table the directory and merge flow operate on. This hook:

- Queries `phorest_clients` with the same search pattern (name, email, phone ilike)
- Does NOT filter out `is_duplicate = true` (both records must be searchable for merging)
- Returns fields compatible with the `MergeClient` interface

### 2. Update `ClientSelector.tsx` to use the new hook

- Import and use `usePhorestClientSearch` instead of `useClientSearch`
- This ensures the merge wizard searches the same table the directory uses

### 3. Pre-populate from URL params using `phorest_clients`

- When `preselectedIds` are provided via URL, fetch those records from `phorest_clients` (not `clients`) so pre-selection works correctly on mount

## Technical Details

| File | Change |
|---|---|
| `src/hooks/useClientsData.ts` | Add `usePhorestClientSearch(query, limit)` -- queries `phorest_clients`, no `is_duplicate` filter |
| `src/components/dashboard/clients/merge/ClientSelector.tsx` | Switch from `useClientSearch` to `usePhorestClientSearch`; add `useEffect` to fetch preselected IDs from `phorest_clients` |

## What stays the same

- The `useClientSearch` hook remains unchanged (other surfaces like booking and POS still use the `clients` table correctly)
- Merge wizard steps 2-4 (PrimarySelector, ConflictResolver, MergeConfirmation) are unaffected
- The `merge-clients` edge function will need to handle `phorest_clients` IDs -- but that's already the table structure it operates on

