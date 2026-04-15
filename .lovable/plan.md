

# Toggle: Show All Stylists vs Only Stylists With Appointments

## What This Does
Adds a toggle to the schedule header that lets operators switch between:
- **Show All** (default ON) — every stylist assigned to that location and scheduled for that weekday appears as a column
- **With Appointments Only** — hides empty stylist columns, reducing clutter on slow days

The toggle includes a tooltip explaining: "All stylists who work at this location on this day."

## Implementation

### 1. Add state to `Schedule.tsx`
Add a `showAllStylists` boolean state (default `true`). Derive `displayedStylists` by filtering `allStylists` to only those with at least one appointment when the toggle is OFF:

```tsx
const [showAllStylists, setShowAllStylists] = useState(true);

const displayedStylists = useMemo(() => {
  let base = selectedStaffIds.length === 0
    ? allStylists
    : allStylists.filter(s => selectedStaffIds.includes(s.user_id));

  if (!showAllStylists) {
    const staffWithAppts = new Set(
      appointments.map(a => a.stylist_user_id || a.staff_user_id).filter(Boolean)
    );
    base = base.filter(s => staffWithAppts.has(s.user_id));
  }
  return base;
}, [allStylists, selectedStaffIds, showAllStylists, appointments]);
```

Pass `showAllStylists` and `setShowAllStylists` to `ScheduleHeader`.

### 2. Add toggle to `ScheduleHeader.tsx`
Place a `Switch` + tooltip next to the existing staff popover. The switch label reads "All Stylists" with a `MetricInfoTooltip` explaining the filter. Only visible on `day` and `week` views (where columns = stylists).

### 3. No other files change
`DayView` and `WeekView` already receive `stylists` as a prop — they'll just get a shorter list when the toggle is off.

## Files to Modify
- `src/pages/dashboard/Schedule.tsx` — state + filtered list
- `src/components/dashboard/schedule/ScheduleHeader.tsx` — toggle UI

## Verification
- Toggle OFF on a day with 8 stylists but only 3 have appointments → only 3 columns show
- Toggle ON → all 8 columns return
- Staff multi-select still works independently (intersection of both filters)
- Tooltip displays on hover

