

## Responsiveness Fix for Appointments & Transactions Page

### Problem
The Appointments tab layout uses fixed widths and single-row flex layouts that cause elements to collide and overflow on narrower viewports. Specifically:
- The search bar wrapper is locked at `w-[640px]`, preventing it from shrinking
- The filter controls and search/toggle are all in one flex row with no wrapping strategy
- On medium-width screens, the filters crush into the search bar and toggle pill

### Changes

**1. `src/components/dashboard/appointments-hub/AppointmentsList.tsx`**

Restructure the search + filter area into responsive rows:

- **Search bar wrapper** (line 146): Change `w-[640px]` to `flex-1 min-w-0 max-w-[640px]` so it fills available space but shrinks gracefully
- **Filter layout** (lines 145-204): Split the single `flex flex-wrap` row into two responsive rows:
  - **Row 1**: Search bar + TogglePill (these are the primary controls)
  - **Row 2**: Status/Location/Stylist filters + CSV button (these are secondary filters)
- This ensures the search bar never overflows and filters always have breathing room
- On mobile, everything stacks naturally via `flex-wrap`

**2. Table column responsive adjustments** (lines 211-221):

Tighten the responsive column visibility to prevent crush at mid-width breakpoints:
- Move "Service" column from `hidden sm:table-cell` to `hidden md:table-cell`
- Move "Time" column from `hidden sm:table-cell` to always visible (it's a short column)
- Keep existing lg/xl breakpoints for Email, Created, Created By

These same responsive classes need to be mirrored in the skeleton loading rows (lines 226-239) and data rows (lines 259-288).

### Files Modified

| File | Change |
|------|--------|
| `src/components/dashboard/appointments-hub/AppointmentsList.tsx` | Fix search bar width, restructure filter layout into responsive rows, adjust table column breakpoints |

### Result
Elements will never crush into edges or each other. The search bar will fill available width up to 640px. Filters will wrap to a second row when space is tight. Table columns will progressively hide at appropriate breakpoints.
