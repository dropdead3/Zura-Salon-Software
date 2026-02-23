

# Late Client Detection: Red Card Styling and "No Show Yet" Badge

## Summary

Add real-time detection for appointments where the scheduled start time has passed but the client has not checked in. These cards will get a red border/ring treatment and a warning badge reading "No Check-In" to alert staff at a glance.

## How It Works

- An appointment is considered "overdue for check-in" when:
  1. The viewed date is today
  2. The current time is past the appointment's start_time
  3. The appointment status is still `booked` or `confirmed` (not yet `checked_in`, `completed`, or `cancelled`)
- The card receives a red ring and subtle red background tint
- A badge reading "No Check-In" appears in the top-right indicator cluster, replacing or supplementing the normal status badge
- Both compact and non-compact card layouts will show the indicator

## Technical Details

**File: `src/components/dashboard/schedule/DayView.tsx`**

1. **Add `isOverdueForCheckin` computed boolean** (after line 240, inside `AppointmentCard`):
   - Use `isToday(date)` check (date is not currently passed to the card -- it will need to be added as a prop or derived from the parent)
   - Compare `parseTimeToMinutes(appointment.start_time)` against current time minutes
   - Only applies when `appointment.status` is `booked` or `confirmed`

2. **Add `date` prop to `AppointmentCardProps`** (around line 195):
   - Add `date: Date` to the interface
   - Pass it through from the parent rendering loop

3. **Apply red styling conditionally** (in the `className` block around line 295-309):
   - Add `isOverdueForCheckin && 'ring-2 ring-red-500/70 ring-inset bg-red-50/30 dark:bg-red-950/20'`

4. **Add "No Check-In" badge in the top-right indicator cluster** (around line 532-537, non-compact path):
   - Before the status badge span, insert a conditional red badge:
   ```tsx
   {isOverdueForCheckin && (
     <span className="text-[8px] px-1 py-px rounded-sm bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium">
       No Check-In
     </span>
   )}
   ```

5. **Add compact card indicator** (around line 482-501):
   - Add a small `AlertTriangle` icon in the compact indicator cluster when overdue

6. **Pass `date` prop from parent** -- update the `AppointmentCard` invocations in the render loop to include `date={date}`

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Add `date` prop to AppointmentCardProps, compute `isOverdueForCheckin`, apply red ring/tint styling, add "No Check-In" badge in both compact and non-compact layouts, pass `date` from parent |

