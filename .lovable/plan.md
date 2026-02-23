
# Fix: Default Appointment Status and Lifecycle Progress Bar

## What You're Seeing

1. **The 4-step progress bar** is a status lifecycle timeline showing: Booked -> Confirmed -> Checked In -> Completed. It visually tracks where an appointment is in its journey.

2. **Why it says "Confirmed"**: When a new appointment is created through the booking wizard, the system incorrectly defaults the status to "confirmed" instead of "booked." Confirmation should only happen when a client responds to a confirmation request (text/email) or when staff manually marks it confirmed.

## Changes

### 1. Fix default status in booking creation

**File:** `supabase/functions/create-phorest-booking/index.ts` (line 181)

Change the default appointment status from `'confirmed'` to `'booked'`. The existing logic for redo approvals (which overrides to `'pending'`) remains unchanged.

### 2. No changes needed to the progress bar

The lifecycle timeline itself is correct -- it accurately reflects the 4-stage journey. The problem was purely that new appointments were skipping the first stage ("Booked") and jumping straight to "Confirmed." Once the default status is fixed, new appointments will correctly show only the first segment filled.

## Technical Detail

- The edge function `create-phorest-booking` line 181: `let appointmentStatus = 'confirmed'` changes to `let appointmentStatus = 'booked'`
- Existing appointments already marked "confirmed" will remain unchanged (this only affects future bookings)
- The Phorest API write-back (line 193) will continue sending `'CONFIRMED'` to Phorest since that's Phorest's expected status -- this is separate from the local status tracking
