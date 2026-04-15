

## Fix Scheduler: Role + Location Filtering

### Problem 1: No role filter
The staff query in `Schedule.tsx` (L311-315) fetches all active/approved `employee_profiles` at the selected location — including receptionists, admins, and super admins. Only service providers (stylists and stylist assistants) should appear as calendar columns.

### Problem 2: Hayleigh's location assignment
Hayleigh Hoy's `location_id` is `north-mesa` in the database. If she's moved to Val Vista Lakes, we need to update this. *(Pending your confirmation on correct location.)*

### Problem 3: Appointment fallback bypasses filtering
The `allStylists` useMemo (L342-375) merges staff from appointments into the column list without checking their role. A receptionist who somehow has an appointment assigned would get a column.

### Problem 4: No org scoping
The query doesn't filter by `organization_id`, which violates tenant isolation rules.

---

### Fix 1 — Add role-based filtering to staff query

**File**: `src/pages/dashboard/Schedule.tsx` (L306-337)

After fetching `employee_profiles`, join against `user_roles` to restrict to `stylist` and `stylist_assistant` only:

```typescript
const { data: locationStylists = [] } = useQuery({
  queryKey: ['schedule-stylists', selectedLocation, orgId],
  queryFn: async () => {
    // 1. Get service-provider user_ids from user_roles
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['stylist', 'stylist_assistant']);
    
    const serviceProviderIds = (roleRows || []).map(r => r.user_id);
    if (serviceProviderIds.length === 0) return [];

    // 2. Fetch profiles for those users, filtered by location + org
    let query = supabase
      .from('employee_profiles')
      .select('user_id, display_name, full_name, photo_url, location_id, location_ids')
      .eq('is_active', true)
      .eq('is_approved', true)
      .in('user_id', serviceProviderIds);

    if (orgId) query = query.eq('organization_id', orgId);
    if (selectedLocation) {
      query = query.or(`location_id.eq.${selectedLocation},location_ids.cs.{${selectedLocation}}`);
    }

    const { data } = await query;
    // Deduplicate by user_id (unchanged)
    ...
  },
});
```

### Fix 2 — Guard the appointment fallback

In the `allStylists` useMemo (L342-375), only add fallback staff if they're already in the `serviceProviderIds` set (passed from the query). Or simpler: skip the fallback entirely for non-location-filtered appointments (since `appointments` is already location-filtered, any valid stylist should already be in the staff list).

### Fix 3 — Update Hayleigh's location (if confirmed)

DB data update via insert tool:
```sql
UPDATE employee_profiles 
SET location_id = 'val-vista-lakes'
WHERE user_id = '5fc4aa39-8076-4775-bebf-e98e46776925';
```

### Scope
- **1 file changed**: `Schedule.tsx` (~30 lines)
- **1 data update**: Hayleigh's location (pending confirmation)
- No migration needed
- Fully Phorest-decoupled

