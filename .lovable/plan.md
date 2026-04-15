

## Fix: Scheduler Showing Wrong-Location Staff

### Root Cause

The `v_all_staff` view does **not** expose the `location_ids` column from `employee_profiles`. The current query in `Schedule.tsx` (L318) uses:

```
.or(`location_id.eq.${selectedLocation},location_ids.cs.{${selectedLocation}}`)
```

Since `location_ids` doesn't exist on the view, the filter silently fails — Supabase ignores the invalid column reference in the `.or()`, returning **all active staff** regardless of location.

### Fix — Two changes

#### 1. Update `v_all_staff` view to include `location_ids`

Add `ep.location_ids` to both sides of the UNION in the view definition. This makes the multi-location array available for filtering.

#### 2. Query `employee_profiles` directly instead of the view (preferred)

Since the scheduler only needs Zura-native profile data (`user_id`, `display_name`, `full_name`, `photo_url`, `location_id`, `location_ids`), we can query `employee_profiles` directly — avoiding the view entirely. This is simpler and already Phorest-decoupled.

**Schedule.tsx L311-318** — Replace:
```typescript
let query = supabase
  .from('v_all_staff' as any)
  .select('user_id, display_name, full_name, photo_url, location_id, location_ids')
  .eq('is_active', true)
  .eq('show_on_calendar', true);

if (selectedLocation) {
  query = query.or(`location_id.eq.${selectedLocation},location_ids.cs.{${selectedLocation}}`);
}
```

With:
```typescript
let query = supabase
  .from('employee_profiles')
  .select('user_id, display_name, full_name, photo_url, location_id, location_ids')
  .eq('is_active', true)
  .eq('is_approved', true);

if (selectedLocation) {
  query = query.or(`location_id.eq.${selectedLocation},location_ids.cs.{${selectedLocation}}`);
}
```

This works because `employee_profiles` **does** have `location_ids`, so the `.or()` filter will correctly match both primary and multi-location staff.

The `show_on_calendar` filter is replaced with `is_approved` since that column lives on `employee_profiles`, not the view. If `show_on_calendar` control is needed, we can add it to `employee_profiles` later.

### Scope
- **1 file changed**: `Schedule.tsx` (~8 lines)
- **No migration needed**
- **No data changes**
- Fully Phorest-decoupled (queries native table directly)

