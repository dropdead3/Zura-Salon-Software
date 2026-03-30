

## Fix: `allAppointmentsComplete` Must Check Actual Appointment Statuses

### Problem
`allAppointmentsComplete` in `AggregateSalesCard.tsx` (line 582) only checks:
1. Whether all locations are past closing time
2. Whether the last appointment's end time has passed
3. Whether `liveSession.inSessionCount > 0`

It never checks `adjustedExpected.pendingCount`. So when an appointment has status `in_progress`, `started`, `arrived`, etc., the card can still show "All appointments complete" if it's past closing time — directly contradicting the gap breakdown which correctly shows the appointment as in-progress.

### Fix

**File:** `src/components/dashboard/AggregateSalesCard.tsx` — line 582-609

Add `adjustedExpected?.pendingCount === 0` as a required condition. If any appointments are still in a non-terminal status (`booked`, `confirmed`, `arrived`, `started`, `in_progress`), the card must not declare completion.

```tsx
const allAppointmentsComplete = useMemo(() => {
  if (!isToday) return false;
  if (liveSession.inSessionCount > 0) return false;

  // NEW: If we have appointment status data showing pending items, not complete
  if (adjustedExpected && adjustedExpected.pendingCount > 0) return false;

  // ... rest of existing time-based logic unchanged ...
}, [isToday, locations, todayActual, liveSession.inSessionCount, adjustedExpected]);
```

This ensures the completion badge and "Final Revenue Today" label only appear when appointments are actually in terminal states (completed, cancelled, no_show) — not just when the clock says the salon should be closed.

Single line addition, single file change.

