

# Show "View in Client Directory" Link for Walk-In Clients

## Problem

The "View in Client Directory" link in the Appointment Detail Panel is hidden for walk-in appointments. The condition currently requires `!isWalkIn`, but walk-in clients can still have a profile in the directory (as shown -- "Eric Day" has a name, phone number, and a `phorest_client_id`).

## Fix

**File: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (line 1018)**

Remove the `!isWalkIn` check so the link appears whenever `appointment.phorest_client_id` exists, regardless of walk-in status.

```text
Before:  {!isWalkIn && appointment.phorest_client_id && (
After:   {appointment.phorest_client_id && (
```

This is a single condition change on one line. The link will now appear for any appointment tied to a client record, including walk-ins.

