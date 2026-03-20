

## Fix "All Team" Filter to Only Show Registered Team Members' Appointments

### Problem
When "All Team" is selected, the query fetches every appointment at the location — including stylists like Jamie who aren't registered team members. Only Eric D. is a team member at this location, so "All Team" should only show his appointments.

### Solution
When `staffFilter === 'all'` in the org-specific demo path, fetch the list of registered team member `user_id`s for the location (same logic as `DockDeviceSwitcher`), then filter appointments to only those whose `stylist_user_id` is in that set.

### Changes

**`src/hooks/dock/useDockAppointments.ts`**

In the org-specific demo branch (line 42–165):

1. Before building the main query, fetch registered team member IDs for the location:
   ```ts
   const { data: teamProfiles } = await supabase
     .from('employee_profiles')
     .select('user_id, location_id, location_ids')
     .eq('organization_id', organizationId)
     .eq('is_active', true)
     .eq('is_approved', true);
   const teamUserIds = (teamProfiles || [])
     .filter(p => p.location_id === locationId || (p.location_ids && p.location_ids.includes(locationId)))
     .map(p => p.user_id);
   ```

2. When `staffFilter` is `'all'` (or unset), instead of no filter, add `.in('stylist_user_id', teamUserIds)` to the query. If `teamUserIds` is empty, return `[]` early.

3. The specific-staff filter path (`staffFilter !== 'all'`) stays as-is — it already filters by `stylist_user_id`.

This ensures "All Team" means "all registered team members at this location," not "every appointment at this location."

