

# Fix: Booked Appointments Not Appearing on Schedule

## Root Cause

Two issues prevent newly booked appointments from showing on the schedule:

### Issue 1: Schedule doesn't navigate to the booked date
After a successful booking, the `QuickBookingPopover` invalidates the query cache and closes -- but the schedule stays on the **current date** (today, Feb 22). If the appointment was booked for a future date (Feb 24), the user won't see it because the day view only shows today's appointments.

### Issue 2: `location_id` is not set on new appointments
The `create-phorest-booking` edge function builds the local `phorest_appointments` record without setting `location_id`. It receives `branch_id` (the Phorest branch ID) and looks up the location for org-level checks, but never maps it to the `location_id` column on the appointment record. This means the appointment has `location_id: null`, which will cause it to disappear when location filters are active.

## Fix

### 1. Navigate to booked date after successful booking

**File:** `src/components/dashboard/schedule/QuickBookingPopover.tsx`

- Add an `onBookingComplete` callback prop that passes the booked date back to the parent.
- On successful booking, call `onBookingComplete(bookedDate)` before closing.

**File:** `src/pages/dashboard/Schedule.tsx`

- Pass `onBookingComplete` to `QuickBookingPopover` that calls `setCurrentDate(date)` so the schedule automatically navigates to show the newly booked appointment.

### 2. Set `location_id` on the local appointment record

**File:** `supabase/functions/create-phorest-booking/index.ts`

- The function already queries the `locations` table to check org settings (line 116-120). Reuse that lookup to also grab the `id` (location_id) from the locations table.
- Add `location_id` to the `localRecord` object before upserting.

## File Summary

| Action | File |
|--------|------|
| Modify | `src/components/dashboard/schedule/QuickBookingPopover.tsx` -- add `onBookingComplete` prop, call it on success with booked date |
| Modify | `src/pages/dashboard/Schedule.tsx` -- pass `onBookingComplete` that navigates to the booked date |
| Modify | `supabase/functions/create-phorest-booking/index.ts` -- set `location_id` from branch_id lookup |

## Technical Details

**QuickBookingPopover changes:**
- Add `onBookingComplete?: (date: Date) => void` to `QuickBookingPopoverProps`
- In the booking mutation `onSuccess`, before `handleClose(true)`, call `onBookingComplete?.(selectedDate)` where `selectedDate` is the date chosen in the wizard

**Schedule.tsx changes:**
```
onBookingComplete={(date) => setCurrentDate(date)}
```

**Edge function changes:**
The existing location lookup (line 116-120) fetches `organization_id` from locations matching `phorest_branch_id`. Extend this to also select the location's `id` field, then set `localRecord.location_id = locData.id` in the record builder.

