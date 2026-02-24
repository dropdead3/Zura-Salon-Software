
Great catch — this is a high-quality bug report because you gave the exact user-facing symptom (“in service now” is wrong after deletion), plus screenshot context. That made root-cause tracing fast.

Prompt enhancement suggestion for future reports:
- Include one affected appointment ID (or client + time), expected outcome, and when you performed the delete.  
This helps isolate whether it’s query filtering, cache staleness, or sync rehydration in one pass.

## What I verified

I traced the “Happening Now” flow and confirmed the bug source in `useLiveSessionSnapshot`:

1. **Active session query does not exclude soft-deleted rows**
   - File: `src/hooks/useLiveSessionSnapshot.ts`
   - Current query filters by date/time window only:
     - `appointment_date = today`
     - `start_time <= now`
     - `end_time > now`
   - It does **not** filter `deleted_at IS NULL`.

2. **Per-stylist day schedule query also ignores soft deletes**
   - Same file, `allTodayQuery` used for “Appointment X of Y” and “Last wrap-up”.
   - This causes deleted appointments to still inflate totals and wrap-up times.

3. **Delete flow does not invalidate live-session cache**
   - File: `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`
   - Deletion sets `deleted_at/deleted_by` correctly, but invalidates only:
     - `['phorest-appointments']`
     - `['appointments-hub']`
   - It does **not** invalidate `['live-session-snapshot']`, so UI may remain stale until interval refetch.

4. **Data evidence**
   - Today’s Eric Day rows include soft-deleted records (`deleted_at` populated) that still match time-window logic.
   - So the indicator can show “in progress” from records that should be hidden.

## Implementation plan

### 1) Fix live-session data integrity filters (primary bug fix)
**File:** `src/hooks/useLiveSessionSnapshot.ts`

Update both queries:

- **Active query (`appointments`)**
  - Add `.is('deleted_at', null)`
  - Exclude terminal/non-active statuses:
    - `.not('status', 'in', '("cancelled","no_show","completed")')`
  - Keep time-window logic (`start_time <= now`, `end_time > now`)

- **All-today query (`allTodayAppts`)**
  - Add `.is('deleted_at', null)`
  - Exclude canceled/no-show (retain completed so day progression remains truthful):
    - `.not('status', 'in', '("cancelled","no_show")')`

Outcome:
- Deleted appointments disappear from “in service now”.
- “Appointment X of Y” and “Last wrap-up” no longer include deleted/cancelled ghost rows.

### 2) Invalidate live-session query immediately after deletion
**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

In `confirmDelete` success path, add:
- `queryClient.invalidateQueries({ queryKey: ['live-session-snapshot'] });`

Outcome:
- Indicator and drilldown update immediately after delete, instead of waiting for poll refresh.

### 3) Keep behavior aligned with existing architecture
This follows your current pattern where calendar/hub already exclude soft-deleted records (`deleted_at IS NULL`).  
The live-session path becomes consistent with those data-integrity standards.

## Edge cases covered

- Soft-deleted appointment in active time window → excluded.
- Deleted appointment still affecting stylist “Appointment 1 of 2” → fixed.
- Same-stylist schedule with one legit active + one deleted future appt → totals reflect only legit records.
- Cancelled/no-show rows overlapping current time due legacy data → excluded from “in progress”.
- Post-delete UI stale state → immediate cache invalidation resolves.

## Risk & mitigation

- **Risk:** Excluding `completed` from active query could hide manually completed-but-still-on-chair edge cases.
- **Mitigation:** “Happening Now” semantics are “currently in service”, so terminal `completed` should not be counted; this aligns with user expectation and reduces false positives.

## Validation checklist (end-to-end)

1. Open dashboard with live indicator visible.
2. Delete an appointment currently shown in Happening Now.
3. Confirm:
   - Header counts decrement immediately.
   - Stylist row disappears if no active appointment remains.
   - “Appointment X of Y” and “Last wrap-up” recompute correctly.
4. Repeat for:
   - Deleted + cancelled + no_show records.
   - Multiple locations with All Locations grouping.
5. Verify no regression in:
   - Live assistant counts.
   - Day schedule card counts.
   - Appointments Hub and Calendar visibility.

## Optional hardening (next pass)

There is a broader platform-level gap: sync upserts can rehydrate rows by `phorest_id` without preserving user-deleted intent.  
If you want, next pass I can add a **sync guardrail** so soft-deleted appointments are not resurrected unintentionally (or are resurrected only with explicit policy).
