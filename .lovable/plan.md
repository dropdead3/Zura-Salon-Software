

## Update Subtitle to "Zura Backroom Station X of Y at [Location]"

**File:** `src/components/dock/settings/DockSettingsTab.tsx`

**Changes:**

1. **Import** `useLocations` is already imported. Additionally import `useQuery` and `supabase` to fetch station count for this location.

2. **Add queries** inside the component:
   - Use the existing `useLocations` hook (already imported) to resolve `staff.locationId` into a location name.
   - Query `backroom_stations` filtered by `organization_id` and `location_id` to get total station count and determine this station's position (or default to "1 of 1" since the Dock doesn't currently track which station number it is).

3. **Line 75-77** — Replace the static `"Mixing Station"` text with a dynamic string:
   ```
   Zura Backroom Station 1 of {totalStations} at {locationName}
   ```
   Since the Dock doesn't currently persist which specific station number it is, we'll show "Station 1 of X" using the count of active stations at the location. The location name comes from resolving `staff.locationId` against the locations list.

Single file, small edit. The subtitle will dynamically show station count and location name from database queries.

