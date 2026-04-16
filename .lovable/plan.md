

User wants the "+ Create Appointment" button on the LEFT and the "7 appts" count on the RIGHT in the bottom action bar.

Simple swap in `ScheduleActionBar.tsx` — move the button JSX before the appointment count span within the same flex group.

## Plan

In `src/components/dashboard/schedule/ScheduleActionBar.tsx`, swap the order of the two elements so the layout becomes:

```
[+ Create Appointment]   [📅 7 appts]
```

instead of the current:

```
[📅 7 appts]   [+ Create Appointment]
```

### Change

- Move the `<Button>` (Create Appointment) to render **before** the appointment-count `<div>`/`<span>` block within their shared flex container.
- Keep all existing styling, spacing (`gap-*`), props, and the `onCreateAppointment` conditional intact — only the source order changes.

### Files touched

- `src/components/dashboard/schedule/ScheduleActionBar.tsx` (one reorder, no logic change)

### Out of scope

- No styling, color, size, or icon changes
- No changes to other action-bar elements (zoom, view toggle, etc.)

