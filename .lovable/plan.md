

## Add "View on Schedule" to Command Center Appointment Surfaces

### What's Changing
Two Command Center surfaces show appointments -- **Today's Prep** and **Today's Queue**. Both will gain a "View on Schedule" action that navigates to `/dashboard/schedule` with the same deep-link pattern already implemented for the forecast drill-down (`focusDate` + `focusAppointmentId` via router state).

### Files

1. **`src/components/dashboard/TodaysPrepSection.tsx`**
   - Import `useNavigate` from react-router-dom and `CalendarDays` icon
   - Make each appointment row clickable (add `cursor-pointer` + `onClick` handler)
   - On click: `navigate('/dashboard/schedule', { state: { focusDate: format(new Date(), 'yyyy-MM-dd'), focusAppointmentId: appt.id } })`
   - Add a subtle `CalendarDays` icon on hover (same pattern as the forecast sheet -- invisible by default, appears on group-hover)

2. **`src/components/dashboard/operations/QueueCard.tsx`**
   - Import `CalendarDays` from lucide-react and `useNavigate` from react-router-dom
   - Add a "View on Schedule" item to the existing `DropdownMenu` (above Edit, with a separator)
   - On click: navigate with `focusDate: appointment.appointment_date` and `focusAppointmentId: appointment.id`

### Interaction
```text
Command Center
  ├─ Today's Prep row → Click → Schedule (day view, appointment selected)
  └─ Queue Card → ⋮ menu → "View on Schedule" → Schedule (day view, appointment selected)
```

No changes needed on the Schedule page -- the deep-link handler from the previous implementation already covers this.

