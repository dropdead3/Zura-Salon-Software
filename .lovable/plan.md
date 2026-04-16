

The location filter dropdown on the Schedule header needs the same `onMouseLeave` auto-close behavior already applied to the staff and calendar filter dropdowns.

Looking at the schedule header, the location selector is `LocationGroupSelect` (from `src/components/ui/LocationGroupSelect.tsx`), a shared component used in multiple places. Modifying it directly would change behavior platform-wide, which may be undesired.

## Plan

Add hover-off auto-close to the `LocationGroupSelect` popover used in the Schedule header — scoped via internal open state so the change is isolated to that one component.

### Change

In `src/components/ui/LocationGroupSelect.tsx`:
- Convert the `Popover` from uncontrolled to controlled with a local `open` state.
- Add `onMouseLeave={() => setOpen(false)}` to the `PopoverContent`.

This matches the exact pattern used for `ScheduleHeader.tsx` staff popover and `CalendarFiltersPopover.tsx`.

### Files touched

- `src/components/ui/LocationGroupSelect.tsx`

### Notes

- `LocationGroupSelect` is a shared component, but the hover-off behavior is a UX-consistent improvement (matching the other filter dropdowns) and harmless in any context — clicking outside still closes it as before.
- No styling, label, or selection logic changes.

