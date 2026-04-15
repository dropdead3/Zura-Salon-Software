

# Fix Appointment Status Badges — Premature "Completed" Marking

## Root Cause (Two Problems)

### Problem 1: Sync Time-Based Inference (Primary)
In `supabase/functions/sync-phorest-data/index.ts` (lines 515-520), the sync marks `booked` appointments as `completed` when `endTime < new Date()`. But `new Date()` in Deno runs in **UTC**, not the org's timezone. A 3:00 PM MST appointment gets marked completed at 3:00 PM UTC — which is 8:00 AM MST.

### Problem 2: Transaction Reconciliation (Secondary)
In the same file (lines 1160-1166), when a client has a transaction on a given date, **all** of that client's appointments on that date get marked `completed` — even multi-appointment clients where only one service was transacted.

### Why It Shows on Screen
The schedule page uses `usePhorestCalendar` which queries `v_all_appointments` (a union of `phorest_appointments` + `appointments`). The `phorest_appointments` table has the bad `completed` status, and the display renders it faithfully.

---

## Implementation Plan

### 1. Fix sync timezone logic
**File:** `supabase/functions/sync-phorest-data/index.ts`

Replace the naive `new Date()` comparison with an org-timezone-aware check. The sync function should resolve the org's timezone from the database and compare against the appointment's end time in that timezone. If timezone resolution is impractical in the sync context, **remove the time-based inference entirely** — let Phorest's own `activationState` be the source of truth for status.

Recommended: Remove the time-based inference block (lines 515-520). The `mapPhorestStatus` function already maps Phorest's `COMPLETED` activationState correctly. Zura should not be guessing completion status based on time.

### 2. Narrow transaction reconciliation
**File:** `supabase/functions/sync-phorest-data/index.ts`

Make the reconciliation more precise — only mark an appointment as `completed` if the transaction's service matches the appointment's service, or if the transaction explicitly references the appointment ID. If Phorest doesn't provide that granularity, limit reconciliation to dates that are strictly in the past (not today).

### 3. Add display-layer safety net
**File:** `src/hooks/usePhorestCalendar.ts`

After fetching appointments, add a post-processing step that prevents future appointments from displaying as `completed`. If an appointment's date is today and its end time hasn't passed (in org timezone), or if its date is in the future, downgrade `completed` status back to `booked` for display purposes. This protects against any sync lag or race conditions.

### 4. Fix existing bad data
Run a one-time migration to reset today's future appointments from `completed` back to `booked`:
```sql
UPDATE phorest_appointments 
SET status = 'booked' 
WHERE appointment_date >= CURRENT_DATE 
  AND status = 'completed'
  AND end_time > CURRENT_TIME;
```

---

## Files to Modify
- `supabase/functions/sync-phorest-data/index.ts` — remove time-based inference, narrow transaction reconciliation
- `src/hooks/usePhorestCalendar.ts` — add display-layer status sanity check

## Files to Verify
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — confirm badge renders from appointment.status (no further changes needed)
- `src/lib/design-tokens.ts` — confirm status badge mappings are correct (they are)

## Verification
- Today's appointments that haven't occurred yet show as "Booked" not "Completed"
- Past appointments still correctly show as "Completed"
- Tomorrow's appointments all show as "Booked"
- No regressions in the day/week/agenda views

