

## Plan: Make Dock Location-Aware (Remove Location Picker from Booking)

### Problem
The booking wizard asks the user to pick a location, but a Dock is inherently tied to a single physical location. The location should be configured once at the device level and used implicitly everywhere.

### Approach
1. Add a `locationId` to the `DockStaffSession` so the entire Dock knows its location
2. Add a location selector in the Device Configurator bar (next to phone/tablet/full toggle) for dev/demo mode
3. Also resolve location from the staff member's profile as a fallback
4. Remove the location picker from the booking wizard's service step — use the Dock's location automatically

### Changes

**1. Expand `DockStaffSession` in `src/pages/Dock.tsx`**
- Add `locationId: string` to the interface
- Persist the dock location in localStorage (`dock-location-id`)
- Pass it through to `DockLayout`

**2. Add location selector to `src/components/dock/DockDeviceSwitcher.tsx`**
- Add a small location dropdown/pill next to the device toggle (only visible in dev/demo mode)
- Fetch locations via `useLocations()` and allow selection
- Persist choice in localStorage (`dock-location-id`)
- Emit changes up to the Dock page state

**3. Resolve location on PIN login**
- When a staff member logs in via PIN, auto-set the Dock location from their `employee_profiles.location_id` if no explicit device location is configured
- Explicit device-level config takes priority over staff profile

**4. Update `DockNewBookingSheet.tsx`**
- Accept `locationId` as a prop (from the Dock session)
- Remove the location selector UI from the service step entirely
- Pass the location directly to `useServicesByCategory(locationId)`
- Use the location's `phorest_branch_id` for the booking mutation

**5. Thread `locationId` through `DockLayout` → `DockScheduleTab` → `DockNewBookingSheet`**
- `DockLayout` receives `locationId` and passes it to tab components
- `DockScheduleTab` passes it to the booking sheet

### Data flow
```text
DockDeviceSwitcher (config) → localStorage → Dock page state
  OR
PIN login → employee_profiles.location_id → Dock page state
  ↓
DockLayout → DockScheduleTab → DockNewBookingSheet
  (locationId used for services query + booking mutation)
```

### No database changes needed

