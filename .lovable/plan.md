

## Add Time-Period Toggle and MM/DD/YYYY Date Format

### Overview

Add a prominent "Past / Today / Future" toggle to the Appointments Hub and standardize all date display to MM/DD/YYYY format.

### Changes

**File: `src/components/dashboard/appointments-hub/AppointmentsList.tsx`**

1. **Add time-period toggle** using the existing `TogglePill` component (already in the codebase at `src/components/ui/toggle-pill.tsx`). Three options:
   - **Past** -- filters to `endDate` = yesterday
   - **Today** -- filters to today only
   - **Future** -- filters to `startDate` = tomorrow

2. **Replace the existing date preset dropdown** (`today / this_week / this_month / last_month / all`) with the new toggle. The toggle will sit prominently in the filter bar, left-aligned after the search bar.

3. **Format all dates as MM/DD/YYYY**:
   - Table "Date" column: change from raw `appointment_date` (YYYY-MM-DD) to `format(parseISO(appt.appointment_date), 'MM/dd/yyyy')`
   - "Created" column: change from `MMM d, h:mm a` to `MM/dd/yyyy h:mm a`
   - CSV export: same MM/DD/YYYY format
   - Detail drawer dates: also updated to MM/DD/YYYY

4. **Default selection**: "Today" will be the default when the page loads, showing the most operationally relevant view.

**File: `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx`**

5. **Update date formatting** in the detail drawer to use MM/DD/YYYY consistently.

### Technical Detail

The `TogglePill` component provides a polished sliding-indicator pill UI. The time-period state will replace `datePreset` and drive the `startDate`/`endDate` filters passed to `useAppointmentsHub`:

```text
type TimePeriod = 'past' | 'today' | 'future';

past:   { endDate: yesterday }
today:  { startDate: today, endDate: today }
future: { startDate: tomorrow }
```

A helper `formatDateDisplay(dateStr)` will be added to centralize the MM/DD/YYYY formatting for the table.

### Files Modified

| File | Change |
|------|--------|
| `src/components/dashboard/appointments-hub/AppointmentsList.tsx` | Replace date preset dropdown with TogglePill; format dates as MM/DD/YYYY |
| `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` | Format dates as MM/DD/YYYY |

