

# Fix: Appointment Card Not Moving After Drag-and-Drop

## Root Cause

The reschedule mutation hook (`useRescheduleAppointment.ts`) invalidates the wrong query key after a successful move.

- **Current (broken):** `queryClient.invalidateQueries({ queryKey: ['phorest-calendar'] })`
- **Actual query key used by the calendar:** `['phorest-appointments', ...]` (defined in `usePhorestCalendar.ts`)

Because the keys don't match, React Query never refetches the appointment data after the move succeeds. The backend updates correctly (hence "Moved to 11:00 AM" toast), but the UI stays stale.

## Fix

In `src/hooks/useRescheduleAppointment.ts`, change line 33 from:

```text
queryClient.invalidateQueries({ queryKey: ['phorest-calendar'] });
```

to:

```text
queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
```

This matches the actual query key used by `usePhorestCalendar.ts` (line 123), so the calendar will immediately refetch and the appointment card will snap to its new position.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useRescheduleAppointment.ts` | Fix query key from `phorest-calendar` to `phorest-appointments` |

One line change. No other files affected.

