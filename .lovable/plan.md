

# Fix: Drag-and-Drop Appointment Reschedule Bug

## Root Cause

The edge function `update-phorest-appointment-time` references a column called `phorest_appointment_id` that does not exist. The actual column name in the `phorest_appointments` table is `phorest_id`.

This causes the database query to fail silently, resulting in the "Appointment not found" error visible in the logs.

## What Happens Today

1. User drags an appointment to a new time slot
2. Frontend calls the `update-phorest-appointment-time` edge function with the correct appointment UUID
3. The edge function runs this query:
   ```
   .select("*, phorest_appointment_id, phorest_staff_id")
   .eq("id", appointment_id)
   ```
4. PostgREST rejects the query because `phorest_appointment_id` is not a valid column (the real column is `phorest_id`)
5. The function throws "Appointment not found"
6. User sees a toast error: "Failed to reschedule"

## Fix

In `supabase/functions/update-phorest-appointment-time/index.ts`:

1. **Line 74** -- Change `.select("*, phorest_appointment_id, phorest_staff_id")` to `.select("*")` (since `*` already includes all columns including `phorest_id` and `phorest_staff_id`)

2. **Line 133** -- Change `localApt.phorest_appointment_id` to `localApt.phorest_id` so the Phorest API call uses the correct field name

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/update-phorest-appointment-time/index.ts` | Fix column name from `phorest_appointment_id` to `phorest_id`, simplify select to `*` |

