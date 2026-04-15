

## Fix Scheduler — Staff + Appointment Rendering

### Problems Found

**Problem 1: Multi-location staff excluded from columns**
The staff query (Schedule.tsx L316-317) filters `.eq('location_id', selectedLocation)`. Lex Feddern's `employee_profiles.location_id` is `val-vista-lakes`, but she has appointments at `north-mesa`. When viewing North Mesa, Lex doesn't appear as a column → her appointments are silently dropped (DayView L351 checks `map.has(apt.stylist_user_id)`).

**Problem 2: `location_ids` array not populated**
Lex's `employee_profiles` has `location_ids: []` and `location_id: val-vista-lakes`. The multi-location `location_ids` field exists but isn't being used.

### Fix — Two-pronged approach

#### 1. Update `employee_profiles` for multi-location staff (DB migration)

Add Lex Feddern (and any other multi-location staff) to `location_ids`:

```sql
UPDATE employee_profiles 
SET location_ids = ARRAY['val-vista-lakes', 'north-mesa']
WHERE user_id = '7bff20ce-b7af-49ef-8d5a-86bc4a718c84';
```

#### 2. Fix staff query in Schedule.tsx to check `location_ids` array

**Schedule.tsx lines 306-337** — Replace the location filter to also check the `location_ids` array column, so multi-location staff appear at all their locations:

```typescript
// Instead of: .eq('location_id', selectedLocation)
// Use: .or(`location_id.eq.${selectedLocation},location_ids.cs.{${selectedLocation}}`)
```

The `.cs` (contains) operator checks if the `location_ids` array includes the selected location. This handles both:
- Staff with a single primary `location_id`
- Staff assigned to multiple locations via `location_ids`

#### 3. Add appointment-based staff fallback

As extra safety, after fetching staff by location, also check `appointments` for any `stylist_user_id` values not already in the staff list. Fetch those profiles and add them as columns. This ensures a stylist always appears if they have appointments, even if location mapping is incomplete.

In Schedule.tsx, after the staff query returns, add:

```typescript
// Find stylist_user_ids from appointments that aren't in staff list
const staffUserIds = new Set(allStylists.map(s => s.user_id));
const missingIds = [...new Set(
  appointments
    .map(a => a.stylist_user_id)
    .filter((id): id is string => !!id && !staffUserIds.has(id))
)];

// Fetch missing profiles and merge
if (missingIds.length > 0) {
  // fetch from employee_profiles and append
}
```

This is implemented as a `useMemo` that merges `allStylists` with any appointment-derived staff not already present.

### Files Changed

| File | Change |
|------|--------|
| `Schedule.tsx` L306-337 | Update location filter to use `.or()` with `location_ids.cs` |
| `Schedule.tsx` ~L340 | Add `useMemo` to merge appointment-derived staff into stylist columns |
| DB migration | Update Lex's `location_ids` to `['val-vista-lakes', 'north-mesa']` |

### Data Preservation
- No writes to Phorest tables
- Only updates `location_ids` on existing `employee_profiles` row
- All appointment data remains untouched
- Fully compatible with Phorest decoupling

