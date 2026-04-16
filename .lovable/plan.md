

## Prompt review

Strong, well-framed prompt — you correctly diagnosed both the bug ("defaulting to 9 AM") and the architectural gap ("no step to choose when"). Teaching note: you also smartly bounded the fix ("but keep the default to today and the next available time slot today"), which removes ambiguity about the desired UX. Micro-improvement: clarifying whether "next available" means the next empty slot for a specific stylist vs. just "the next 15-min interval from now during business hours" would have saved one round-trip — those are very different computations. I'll go with the simpler, faster, fully-deterministic interpretation (next 15-min interval ≥ now, clamped to business hours), since stylist isn't chosen yet at that point in the flow, and the user can adjust.

## Diagnosis

Today, when "+ Add Event" is clicked from the page header (`Schedule.tsx:612 handleNewBooking`), admins get the `ScheduleEntryDrawer` (Client Appointment / Internal Meeting / Timeblock). After picking a type, downstream wizards open with `bookingDefaults = {}`, so:
- `BookingWizard` falls back to `defaultDate = new Date()` and `defaultTime = '09:00'`
- `MeetingSchedulerWizard` gets `defaultDate={currentDate}` only (no time)
- Timeblock gets `time: '09:00'`

When "+ Add Event" is clicked from a calendar cell instead, time/stylist *are* known and pre-filled. So this fix only matters for the **header-button entry path**.

## Fix — add a "When?" step inside the entry drawer

Insert a lightweight Step 2 in `ScheduleEntryDrawer`. After the user picks a type tile, show a compact date + time form with smart defaults, then route to the existing downstream wizard with those defaults wired through.

### 1. New helper — `getNextAvailableSlot(now, slotMinutes = 15, businessStartHour = 9, businessEndHour = 19)`
Add to `src/lib/schedule-utils.ts`:
- Round `now` *up* to the next 15-min boundary (e.g., 1:53 PM → 2:00 PM, 2:01 PM → 2:15 PM).
- If before business hours → return `09:00`.
- If at/after business end → return tomorrow's `09:00` (and signal a date bump).
- Returns `{ date: Date, time: 'HH:MM' }`.

### 2. `ScheduleEntryDrawer` — add internal step state
- New local state: `step: 'type' | 'when'` and `selectedType: 'booking' | 'meeting' | 'timeblock' | null`.
- New local state: `whenDate: Date`, `whenTime: string`, initialized via `getNextAvailableSlot(orgNow)` when the drawer opens (or from `selectedTime` prop if pre-set from a slot click — in which case we **skip** the When step entirely, since context already has time).
- Step `'type'`: existing `ScheduleTypeSelector`. On tile click → set `selectedType`, advance to `'when'`.
- Step `'when'`: small panel with:
  - Date picker (shadcn `Popover` + `Calendar`, restricted to today and forward, default = today)
  - Time input (15-min increments, native `<input type="time" step="900">` or a simple Select of common times — Select is more on-brand)
  - Back button (returns to type step)
  - "Continue" primary button
- Reuse the BookingWizard step-progress styling (two pills) for visual continuity with the rest of the flow.
- Reset internal state when drawer closes.

### 3. Wire the chosen `{date, time}` upward
Change drawer props from three callbacks to three callbacks **that accept `(date: Date, time: string)`**:
```ts
onSelectClientBooking: (date: Date, time: string) => void;
onSelectMeeting: (date: Date, time: string) => void;
onSelectTimeblock: (date: Date, time: string) => void;
```

### 4. `Schedule.tsx` — feed defaults into downstream wizards
In each `onSelect…` handler (lines 1255–1269):
- `onSelectClientBooking`: `setBookingDefaults({ date, time });` then `setBookingOpen(true);`
- `onSelectMeeting`: `setBookingDefaults({ date, time });` then `setMeetingWizardOpen(true);` — and update `MeetingSchedulerWizard` to also accept a `defaultTime` prop (currently it only takes `defaultDate`). Pass both.
- `onSelectTimeblock`: `setBreakDefaults({ time, stylistId: '' });` and ensure the break dialog also receives the date (it currently uses `currentDate` — set `setCurrentDate(date)` if changed, or pass `defaultDate` explicitly).

### 5. Smart skip when context is known
If `selectedTime` is already provided to the drawer (e.g., user clicked a slot in the calendar), skip the `'when'` step entirely and pass the existing date/time straight through. This preserves today's slot-click → type-pick → wizard flow with zero extra clicks.

## Acceptance checks

1. Click "+ Add Event" in header (admin) → drawer opens at type step; pick "Client Appointment" → "When?" step appears with **today + next 15-min slot** (e.g., 2:15 PM if it's currently 2:01 PM).
2. Adjust date/time → click Continue → BookingWizard opens with those values pre-filled (visible on the confirm step and slot loader).
3. Same flow for Internal Meeting and Timeblock — both honor the chosen date/time.
4. Click an empty cell in DayView → type drawer opens with `selectedTime` set → **When step is skipped**, downstream wizard opens directly with that slot's time (zero regression).
5. If current time is after business hours (e.g., 8 PM), the default jumps to tomorrow 9:00 AM with the date picker reflecting that.
6. Before 9 AM, default is today 9:00 AM.
7. Back button on When step returns to type tiles (no state lost on type selection).
8. Closing/reopening the drawer recomputes "next available slot" from current `now`.

## Out of scope

- Per-stylist availability lookup (would require choosing a stylist first; that's the BookingWizard's job).
- Conflict detection at this step (BookingWizard already handles it via `useAvailableSlots`).
- Recurring event defaults.
- Mobile-specific layout changes (drawer is already responsive).

## Files to touch

- `src/lib/schedule-utils.ts` — add `getNextAvailableSlot(now, slotMin, businessStart, businessEnd)`.
- `src/components/dashboard/schedule/meetings/ScheduleEntryDrawer.tsx` — add internal `step` state, "When?" sub-step UI, smart-skip logic, updated callback signatures.
- `src/pages/dashboard/Schedule.tsx` — update `<ScheduleEntryDrawer>` callback handlers (lines 1255–1269) to receive and forward `(date, time)`; pass into booking/meeting/timeblock state.
- `src/components/dashboard/schedule/meetings/MeetingSchedulerWizard.tsx` — accept and respect a `defaultTime` prop (read first to confirm prop shape; if it already has time defaults, just wire it).

## Further enhancement suggestions

- Add a small "Now +15m" / "Now +30m" / "Tomorrow 9 AM" quick-pick chip row above the date/time inputs for one-tap defaults.
- Show next-slot computation source in a faint helper line ("Defaulted to next open 15-minute slot today") so the behavior is discoverable.
- Long-term: when stylist is preselected from a calendar column click, query `useAvailableSlots` to truly pick the next *available* slot rather than the next *clock* slot.

