

## Link Forecast Appointments to Schedule

### What's Changing
Each appointment row in the `DayAppointmentsSheet` (the drill-down from the week-ahead forecast card) will become clickable. Tapping a row closes the sheet and navigates to `/dashboard/schedule`, passing the appointment date and appointment ID via router state. The Schedule page will pick up that state, set the date, switch to day view, and auto-select the appointment to open its detail panel.

### Files

1. **`src/components/dashboard/sales/DayAppointmentsSheet.tsx`**
   - Accept an optional `onNavigateToSchedule` callback prop (or use `useNavigate` directly)
   - Wrap each `AppointmentCard` with a clickable action (subtle icon button or the whole card) that calls `navigate('/dashboard/schedule', { state: { focusDate: day.date, focusAppointmentId: apt.id } })` and closes the sheet
   - Add a small `ExternalLink` or `CalendarDays` icon to each row as a visual affordance

2. **`src/pages/dashboard/Schedule.tsx`**
   - In the existing `useEffect` that reads `location.state`, add handling for `focusDate` and `focusAppointmentId`
   - When present: parse the date, call `setCurrentDate(parseISO(focusDate))`, `setView('day')`, and after appointments load, call `setSelectedAppointment` with the matching appointment
   - Clear the state with `window.history.replaceState` to prevent re-triggering on refresh

### Interaction
```text
Forecast Card → Click day bar → DayAppointmentsSheet opens
  → Click appointment row → Sheet closes
  → Navigate to /dashboard/schedule (day view, correct date)
  → Appointment auto-selected + detail panel opens
```

