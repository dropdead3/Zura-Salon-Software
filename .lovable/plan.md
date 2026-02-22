

# Fix: Appointments Not Appearing on Schedule

## Root Cause

The `QuickBookingPopover` sends the wrong value for `branch_id` when invoking `create-phorest-booking`. On line 712, it sends `selectedLocation` (the internal location ID like `"north-mesa"`), but the edge function expects the Phorest branch ID (like `"hYztERWvOdMpLUcvRSNbSA"`).

This causes the edge function's location lookup (`.eq("phorest_branch_id", branch_id)`) to find nothing, so `location_id` on the appointment record stays `null`.

The Schedule page then filters appointments by `apt.location_id === selectedLocation`, which drops any appointment with `null` location_id. Result: the appointment exists in the database but is invisible on the calendar.

## Fix

### 1. Send the correct Phorest branch ID from QuickBookingPopover

**File:** `src/components/dashboard/schedule/QuickBookingPopover.tsx`

Line 712 currently sends:
```
branch_id: selectedLocation
```

Change to use the already-computed `selectedLocationBranchId` (line 598-601):
```
branch_id: selectedLocationBranchId
```

Also add a guard: if `selectedLocationBranchId` is null, throw before invoking.

### 2. Also pass `location_id` directly to the edge function

As a belt-and-suspenders approach, pass the known `location_id` (`selectedLocation`) in the request body so the edge function can use it as a fallback, avoiding a redundant database lookup.

**File:** `supabase/functions/create-phorest-booking/index.ts`

- Accept optional `location_id` in the request body
- Use it as fallback if the branch-based lookup returns nothing

### 3. Fix existing appointments with null location_id

Run a database update to set `location_id` on the two Eric Day appointments that were already created with `null`.

### 4. Check BookingWizard for the same bug

**File:** `src/components/dashboard/schedule/booking/BookingWizard.tsx`

Verify whether the same `branch_id: selectedLocation` mistake exists there and fix it if so.

## File Summary

| Action | File |
|--------|------|
| Modify | `src/components/dashboard/schedule/QuickBookingPopover.tsx` -- send `selectedLocationBranchId` instead of `selectedLocation` as `branch_id`, and also pass `location_id` |
| Modify | `supabase/functions/create-phorest-booking/index.ts` -- accept optional `location_id` field as fallback |
| Modify | `src/components/dashboard/schedule/booking/BookingWizard.tsx` -- same fix if applicable |
| Data fix | Update existing null-location appointments to correct location_id |

