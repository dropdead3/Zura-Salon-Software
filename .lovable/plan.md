

# Team Commission Roster Enhancements

## What changes

**File:** `src/components/dashboard/settings/TeamCommissionRoster.tsx`

### 1. Location filter using resolved names
- Import `useActiveLocations` from `@/hooks/useLocations` to get location names
- Replace the current `locations` memo (which only shows raw IDs) with resolved location names in the dropdown
- Always show the location filter (not just when `locations.length > 1`) since multi-location stylists need filtering
- Filter logic: when a location is selected, show members whose `location_id` matches OR whose `location_ids` array contains that location

### 2. Full names instead of display names
- Change the name column from `member.display_name || member.full_name` to `member.full_name` (always show full name)

### 3. Role badges for non-stylists
- For team members who have admin/manager roles but are NOT stylists (no stylist role in their `roles` array), show a role badge (e.g., "GM", "Manager") next to their name
- Gray out (reduce opacity) the entire row for non-stylist admins/managers who appear in the roster — they appear because they have a level assigned, but commission tracking is secondary for them

### 4. Multi-location badge
- Check if a member has `location_ids` with more than one entry (or `location_id` plus additional entries in `location_ids`)
- If so, display a small "Multi-Location" badge next to their name
- When filtering by a specific location, multi-location stylists who work at that location should appear and retain their badge

### 5. Duplicate entries per location
- When filtering "All Locations", multi-location stylists appear once (with their multi-location badge)
- When filtering by a specific location, only stylists assigned to that location appear

## Technical details

- Role badge config reused from `@/lib/roleBadgeConfig.ts` (`getRoleBadgeConfig`)
- Location names resolved via `useActiveLocations` hook joined against `employee_profiles.location_id` / `location_ids`
- Non-stylist detection: `!member.roles?.includes('stylist')` — these rows get `opacity-50` treatment
- Multi-location detection: count unique locations from `location_id` + `location_ids` array > 1

**1 file changed. No database changes.**

