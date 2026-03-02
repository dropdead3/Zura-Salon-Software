

## Wire Chair/Station Management into Location Settings

Great observation. You've identified a real structural gap: the chair assignments feature reads from `rental_stations`, but the Location Settings edit dialog has no way to configure stations for a location. The only place to manage `rental_stations` today is buried in Booth Renters → Station Assignment Manager -- which is unintuitive for salon chair assignments.

### Current State

- **Chair Assignments** (`useChairAssignments.ts`) queries `rental_stations` filtered by `location_id` and `is_available = true`
- **Rental Stations** are only manageable via `StationAssignmentManager.tsx` inside the Booth Renters section
- **Location Settings** edit dialog has Staffing Capacity fields but zero station/chair configuration
- When no `rental_stations` exist for a location, the ChairGrid shows "No chairs configured" with a link to Location Settings -- which doesn't actually let you fix the problem

### Proposed Changes

**1. Add a "Stations" tab to the Location Edit Dialog**

In `LocationsSettingsContent.tsx`, add a fourth tab ("Stations") to the existing Details / Hours / Holidays tab set. This tab would:
- Show current station count for the location
- Allow quick-adding N stations (bulk create) with a default name pattern ("Station 1", "Station 2", etc.)
- List existing stations with inline edit/delete
- Reuse the existing `useRentalStations` / `useCreateStation` / `useDeleteStation` hooks

Only show this tab when editing (not creating) a location, since we need the location ID.

**2. Update the ChairGrid empty-state link**

Change the "Go to Location Settings" button to open the Location Settings with the correct location pre-selected and the Stations tab active (or at minimum point to the right settings category).

**3. No feature toggle needed**

The chair assignments page already gracefully handles zero stations (shows the empty state). Adding a toggle would add configuration overhead without structural benefit. The gate is implicit: if you have stations, you can assign chairs; if not, the empty state guides you to create them.

### Files Touched

- `src/components/dashboard/settings/LocationsSettingsContent.tsx` -- add "Stations" tab with station CRUD UI
- `src/components/dashboard/chair-assignments/ChairGrid.tsx` -- improve empty-state guidance

### Technical Details

The Stations tab will import from `useRentalStations` and render a compact list with:
- A "Quick Add Stations" input (number + button) that calls `useCreateStation` in a loop
- Each station row showing name, number, availability toggle, and delete button
- Station count summary at the top

The `rental_stations` table already has `location_id`, `station_name`, `station_number`, `station_type`, `is_available`, and `organization_id` -- all the fields needed. No database changes required.

