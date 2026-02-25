

## Bug: "Happening Now" Shows Cancelled Appointments

### Root Cause

When you cancel an appointment via the detail panel, `usePhorestCalendar.ts` fires the `updateStatus` mutation. On success (line 223), it only invalidates `['phorest-appointments']`:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
  toast.success('Appointment updated');
},
```

It does **not** invalidate `['live-session-snapshot']`. The "Happening Now" indicator has a 60-second refetch interval (`refetchInterval: 60_000`), so it continues showing the cancelled appointment as "in progress" until the next automatic refetch.

The delete flow already handles this correctly (line 833 of `AppointmentDetailSheet.tsx` invalidates `live-session-snapshot`), but the status change flow was missed.

### Fix

**File: `src/hooks/usePhorestCalendar.ts`** (line 223-226)

Add `live-session-snapshot` invalidation to the `updateStatus` mutation's `onSuccess`:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
  queryClient.invalidateQueries({ queryKey: ['live-session-snapshot'] });
  toast.success('Appointment updated');
},
```

This ensures that any status change (cancel, no-show, complete, confirm, check-in) immediately refreshes the live session indicator. Cancel and no-show will remove the appointment from "Happening Now"; complete will too. Confirm and check-in won't change visibility but the refetch is harmless.

### Scope

1 line added in 1 file.

