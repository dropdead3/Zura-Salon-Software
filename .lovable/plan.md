

## Add "Timeblock / Break" Option to Schedule Type Selector

### Change Summary

Add a third button to the `ScheduleTypeSelector` for creating timeblocks/breaks. This mirrors the existing break dialog flow already wired up in `Schedule.tsx`.

### Changes (2 files)

**1. `ScheduleTypeSelector.tsx`**
- Add `onSelectTimeblock` callback prop
- Add a third button with `Clock` icon (from lucide-react), label "Timeblock / Break", description "Lunch, personal time, focus block"
- Same button styling as existing two options

**2. `Schedule.tsx`**
- Pass `onSelectTimeblock` to `ScheduleTypeSelector`
- Handler: close type selector, set `breakDefaults` with the clicked time/stylist, open `breakDialogOpen`

```text
Type Selector options:
  ┌─ Client Appointment   (CalendarPlus)  → booking wizard
  ├─ Internal Meeting      (Users)         → meeting wizard
  └─ Timeblock / Break     (Clock)         → break/block form
```

Two files, ~15 lines total.

