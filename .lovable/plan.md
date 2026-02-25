

## Fix: Stale Status Badge After Cancellation

The issue is straightforward. `selectedAppointment` in `Schedule.tsx` (line 108) is stored as a `useState` snapshot. When you cancel, the edge function updates the DB and `queryClient.invalidateQueries` refetches the `appointments` array -- but the `selectedAppointment` state object still holds the old data with `status: 'checked_in'`. The detail panel renders from this stale prop.

### Fix

Add a `useEffect` in `Schedule.tsx` that syncs `selectedAppointment` with the live query data whenever `appointments` changes. If the selected appointment exists in the refreshed array, replace the state with the fresh copy. If it no longer appears (e.g., filtered out), keep the current reference so the panel doesn't blank out mid-transition.

**File:** `src/pages/dashboard/Schedule.tsx`

After line ~108 (`const [selectedAppointment, setSelectedAppointment] = ...`), add:

```typescript
// Keep selectedAppointment in sync with latest query data
useEffect(() => {
  if (selectedAppointment && appointments.length > 0) {
    const fresh = appointments.find(a => a.id === selectedAppointment.id);
    if (fresh && fresh.status !== selectedAppointment.status) {
      setSelectedAppointment(fresh);
    }
  }
}, [appointments]);
```

This compares the `status` field specifically to avoid unnecessary re-renders on every query refetch. When the mutation completes and the query invalidates, the fresh appointment object (with `status: 'cancelled'`) replaces the stale one, and the detail panel badge updates immediately.

### What Does NOT Change

- Mutation logic in `usePhorestCalendar.ts` -- already correctly invalidates queries
- Edge function -- no changes needed
- `AppointmentDetailSheet.tsx` -- it correctly reads from the `appointment` prop; the prop was just stale

### One file changed

| File | Change |
|---|---|
| `src/pages/dashboard/Schedule.tsx` | Add useEffect to sync `selectedAppointment` with live query data |

