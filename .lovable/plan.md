

## Bidirectional Status Sync Between Scheduler and Dock + Payment Badges

**Problem:** The Dock and Scheduler use separate edge functions (`update-phorest-appointment` and `update-booking`) to update appointment status. Changes made in one place don't propagate to the other. Additionally, completed appointments need payment status badges (Paid/Unpaid/Comp).

### Current Architecture

```text
Dock (Backroom)                    Scheduler (Dashboard)
       │                                  │
       ▼                                  ▼
update-phorest-appointment         update-booking
       │                                  │
       ▼                                  ▼
phorest_appointments table         appointments table
```

These are two separate tables with two separate edge functions. Status changes in one don't reflect in the other.

### Plan

#### 1. Cross-table status sync in `update-phorest-appointment` edge function

**File: `supabase/functions/update-phorest-appointment/index.ts`**

After updating the primary table, also update the mirror table:
- If the update targeted `phorest_appointments`, also update `appointments` where the appointment is linked (by matching `phorest_id` or a shared identifier)
- If the update targeted `appointments`, also update `phorest_appointments` if a linked record exists

This ensures a cancel/no-show/complete from the Dock reflects in the Scheduler's `appointments` table.

#### 2. Cross-table status sync in `update-booking` edge function

**File: `supabase/functions/update-booking/index.ts`**

After the `update_booking_status` RPC call succeeds, check if the appointment has a linked `phorest_appointments` record and update its status too. This ensures status changes from the Scheduler reflect in the Dock's data source.

#### 3. Add `payment_status` field to appointment data

**Database migration:** Add a `payment_status` column to both `phorest_appointments` and `appointments` tables:
- Values: `'pending'`, `'paid'`, `'unpaid'`, `'comp'`
- Default: `'pending'`

#### 4. Payment status badges on completed cards

**File: `src/components/dock/schedule/DockAppointmentCard.tsx`**

Extend the `STATUS_BADGE` map with payment badges for completed appointments:
- `paid`: green badge "Paid"
- `unpaid`: red badge "Unpaid"  
- `comp`: slate/muted badge "Comp"

Show the payment badge on completed cards alongside or instead of the status badge.

#### 5. Update `DockAppointment` type

**File: `src/hooks/dock/useDockAppointments.ts`**

Add `payment_status` to the `DockAppointment` interface and include it in the query select.

### Summary of changes

| File | Change |
|------|--------|
| `supabase/functions/update-phorest-appointment/index.ts` | Add cross-table sync to `appointments` |
| `supabase/functions/update-booking/index.ts` | Add cross-table sync to `phorest_appointments` |
| DB migration | Add `payment_status` column to both tables |
| `src/hooks/dock/useDockAppointments.ts` | Add `payment_status` to type + query |
| `src/components/dock/schedule/DockAppointmentCard.tsx` | Add payment badges for completed cards |

