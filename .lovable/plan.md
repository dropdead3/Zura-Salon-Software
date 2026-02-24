

## Fix: Slow Drag-and-Drop Feedback with Optimistic Updates

### Problem

When dragging an appointment to a new time slot, the UI waits ~3 seconds for the full round-trip:
1. Edge function call to `update-phorest-appointment-time`
2. Query invalidation of `phorest-appointments`
3. Re-fetch and re-render

During this time, the appointment snaps back to its original position, then jumps to the new one. There are also **duplicate toasts** -- one from `useRescheduleAppointment.onSuccess` ("Appointment rescheduled locally") and another from `DayView.handleDragEnd` ("Moved to 2:00 PM").

### Solution

Add optimistic cache updates so the appointment visually moves **instantly** on drop, before the server responds.

### Changes

#### 1. `src/hooks/useRescheduleAppointment.ts` -- Add Optimistic Update

- Add an `onMutate` handler that:
  - Cancels in-flight `phorest-appointments` queries (prevents race conditions)
  - Snapshots current cache data for rollback
  - Immediately updates the appointment's `start_time` (and `stylist_user_id` if staff changed) in the query cache
  - Stores the previous snapshot in mutation context

- Update `onError` to restore the snapshot if the mutation fails

- **Remove the duplicate toast** from `onSuccess` -- let the caller (`DayView`) control the toast message (it already shows "Moved to 2:00 PM" with an Undo button, which is better UX)

- Keep the `invalidateQueries` call in `onSuccess` to ensure the cache stays fresh after server confirmation

#### 2. `src/components/dashboard/schedule/DayView.tsx` -- Add Instant Drop Toast

- Show an **immediate** info toast on drop (before server response): "Moving appointment..." -- this gives instant confirmation that the action was registered
- On success: replace with the existing "Moved to [time]" toast with Undo button
- On error: the `useRescheduleAppointment` hook handles the error toast and rollback

### Technical Detail

The optimistic update modifies all cached queries matching the `phorest-appointments` prefix. Since the query key includes date range and filters, we use `queryClient.setQueriesData` with a partial key match to update all relevant caches.

```text
User drops appointment
  |
  +---> [Instant] Cache updated, appointment visually moves
  +---> [Instant] "Moving..." toast shown
  |
  +---> [~2-3s] Edge function completes
  |       |
  |       +---> Success: "Moved to 2:00 PM" toast with Undo
  |       +---> Failure: Cache rolled back, error toast
  |
  +---> [Background] Query refetch confirms final state
```

### Files Modified

- `src/hooks/useRescheduleAppointment.ts` -- Add `onMutate` optimistic update, remove duplicate toast
- `src/components/dashboard/schedule/DayView.tsx` -- Minor: no structural changes needed since the optimistic update handles the visual snap

### What This Fixes

- Appointment moves visually **on drop** instead of after 3+ seconds
- No more duplicate toasts
- Automatic rollback if server fails
- Undo still works (re-invokes the mutation with original time)
