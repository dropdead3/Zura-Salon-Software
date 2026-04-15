

## Fix Scheduler — Stylists Query

### Problem
`Schedule.tsx` lines 307-348: The stylists query uses an FK join (`employee_profiles!phorest_staff_mapping_user_id_fkey(...)`) on the `v_all_staff` view. Views don't support FK joins — the query returns a 400 error, so zero stylists render and the calendar grid appears empty.

### Fix — `src/pages/dashboard/Schedule.tsx` (lines 307-348)

Replace the broken FK join with a flat select from `v_all_staff`, which already exposes `display_name`, `full_name`, `photo_url`, and `location_id`:

- Remove the nested `employee_profiles!fkey(...)` join
- Select flat columns: `user_id, display_name, full_name, photo_url, location_id`
- Replace `phorest_branch_id` filter with `location_id` (Zura-owned)
- Cast results as `any[]` per established pattern
- Update query key to use `selectedLocation` instead of `selectedBranchId`

### Data Preservation
- No writes, no deletions
- Uses Zura-owned `location_id` and `employee_profiles` data (surfaced through the view)
- Fully compatible with Phorest decoupling — no Phorest-specific dependencies remain in this query

### Scope
Single file change, ~40 lines replaced. No database migration needed.

