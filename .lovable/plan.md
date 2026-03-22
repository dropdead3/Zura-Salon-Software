

## Sort Appointments by Start Time Within Each Section

**Problem:** Appointments within each group (Active, Scheduled, Completed, etc.) are displayed in insertion order rather than sorted by start time.

### Change — `src/components/dock/schedule/DockScheduleTab.tsx`

In the `groupAppointments` function (lines 42-64), add a sort-by-`start_time` step to each array before returning:

```ts
const sortByTime = (a: DockAppointment, b: DockAppointment) =>
  (a.start_time || '').localeCompare(b.start_time || '');

return {
  active: active.sort(sortByTime),
  scheduled: scheduled.sort(sortByTime),
  completed: completed.sort(sortByTime),
  noShow: noShow.sort(sortByTime),
  cancelled: cancelled.sort(sortByTime),
};
```

Single function update, one file. String comparison on `HH:mm` format naturally gives chronological order.

