

# Redesign Bottom Action Bar: Payment Queue Bubbles

## Summary

Transform the bottom action bar from an appointment-action toolbar into a **payment queue bar**. Remove all action buttons (now housed in the appointment detail panel), replace the center with scrollable client-name bubble buttons for clients who need to check out or are overdue, and move the Schedule Key icon to the right side of the bar.

## What Changes

**Current bar:** Undo | Client info or count | Check In, Pay, Cancel, Notes, Confirm | (Legend beside bar)

**New bar:** Appointment count | [Client bubble] [Client bubble] ... (scrollable) | Legend Key icon

### Client Bubble Logic

A client appears as a bubble when their appointment (today, at the selected location) matches one of these conditions:

1. **Nearing Checkout** -- Status is `checked_in` AND current time is within 15 minutes of or past the appointment `end_time`. These clients are finishing up and need to pay soon.
2. **Overdue Payment** -- Status is `checked_in` AND current time is past the appointment `end_time`. These clients have finished but haven't been checked out yet.

Bubbles will be sorted by urgency (most overdue first). Each bubble shows the client's first name and a subtle color indicator:
- Amber border/ring for "nearing checkout" (within 15 min of end time)
- Red border/ring for "overdue" (past end time)

Clicking a bubble selects that appointment and opens the appointment detail panel (where payment actions live).

## Technical Details

### File: `src/components/dashboard/schedule/ScheduleActionBar.tsx` (rewrite)

- Remove all action button props (`onCheckIn`, `onPay`, `onRemove`, `onNotes`, `onConfirm`, `onUndo`, `onViewDetails`)
- New props:
  - `appointments: PhorestAppointment[]` -- today's appointments for the selected location
  - `onSelectAppointment: (apt: PhorestAppointment) => void` -- clicking a bubble selects and opens the detail panel
  - `todayAppointmentCount: number`
- Left side: Calendar icon + appointment count (existing pattern)
- Center: Horizontally scrollable row of client bubble buttons, filtered and sorted by checkout urgency
- Right side: `ScheduleLegend` component (moved inside the bar)
- Urgency calculation uses `end_time` and current clock time, refreshed every 60 seconds via a `useEffect` interval
- Empty state when no clients need attention: subtle "All clear" message

### File: `src/pages/dashboard/Schedule.tsx`

- Remove `ScheduleLegend` as a standalone element beside the bar
- Remove action-related props from `ScheduleActionBar` usage (`onCheckIn`, `onPay`, etc.)
- Pass `appointments` (filtered to today + selected location) and `onSelectAppointment` callback that sets `selectedAppointment` and opens `detailOpen`
- Keep the cancel reason dialog and other sheets as-is (they're triggered from the detail panel now)

### File: `src/components/dashboard/schedule/ScheduleLegend.tsx`

- No structural changes; it will simply be rendered inside the action bar instead of beside it
- Popover `side` may change from `"top"` to best fit from the right side of the bar

| File | Change |
|---|---|
| `src/components/dashboard/schedule/ScheduleActionBar.tsx` | Rewrite: remove action buttons, add payment queue bubbles, embed ScheduleLegend on right |
| `src/pages/dashboard/Schedule.tsx` | Update bar props: pass appointments array and selection callback, remove standalone ScheduleLegend |
| `src/components/dashboard/schedule/ScheduleLegend.tsx` | Minor: adjust popover alignment for right-side positioning |

