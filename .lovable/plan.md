## Goal
Remove the right-edge hover-shrink behavior on **past appointments** so the visual cue ("you can schedule next to this") never appears retroactively. Future and current appointments retain the affordance unchanged.

## Root cause
`AppointmentCard` (in `src/components/dashboard/schedule/DayView.tsx`, lines 240–338) tracks `isHoveredRight` from `handleMouseMove` whenever the cursor enters the right 24px gutter. The card width then collapses to 70%, exposing the underlying time slots for booking. This logic runs unconditionally — past, present, and future cards all behave the same.

## Plan

### 1. Compute `isPastAppointment` inside `AppointmentCard`
Use the existing timezone-safe `useOrgNow()` already wired into `DayView` for `isPastSlot`. Pass two derived values into `AppointmentCard` rather than re-deriving inside (keeps the card pure and avoids duplicate hook calls per card):

- `isPastAppointment: boolean` — computed at the render site (lines 1093–1138) using:
  ```ts
  const aptEndMin = parseTimeToMinutes(apt.end_time);
  const isPastAppointment =
    isDayBeforeToday(date) ||                        // viewed date is before today
    (showCurrentTime && aptEndMin <= dayNowMins);    // today + end already elapsed
  ```
- For the "before today" half, reuse `useOrgNow()`'s timezone-safe today check (compare `date` string against the org-today string — already a pattern in the codebase per the Schedule unified mechanics canon).

### 2. Gate the hover affordance
Inside `AppointmentCard`:
- **Short-circuit `handleMouseMove`** when `isPastAppointment` is true — never set `isHoveredRight`.
- **Drop the `isHoveredRight` branch from `cardWidth`** when past, so width stays at `overlapWidth` regardless of cursor position.
- Skip the `useEffect` that tracks window mousemove when past (cheap correctness — no listener overhead on dozens of past cards).

```tsx
// In AppointmentCard
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  if (isDragOverlay || isHoveredRight || isPastAppointment) return;
  // ...existing
};

const cardWidth = isDragOverlay
  ? undefined
  : isOverlapping
    ? overlapWidth
    : (isHoveredRight && !isPastAppointment)
      ? `calc(${100 / totalOverlapping * 0.7}%)`
      : overlapWidth;
```

### 3. Props change
Add one optional prop to `AppointmentCardProps`:
```ts
isPastAppointment?: boolean; // default false
```
Default falsy preserves existing behavior anywhere `AppointmentCard` is used outside `DayView` (drag overlay, etc.).

## Files touched
- `src/components/dashboard/schedule/DayView.tsx` — only file. Two regions:
  - `AppointmentCard` props + body (~lines 230–338)
  - `AppointmentCard` render call (~line 1112) — pass `isPastAppointment`

## Out of scope (intentionally)
- The **past-time grey overlay** (`currentTimeOverlayPx`, line 1026) and **isPastSlot** booking gate already exist and stay untouched — this plan only kills the misleading hover affordance on the appointment card itself.
- Cards that span across "now" (start before now, end after now) are treated as **not past** — the right-edge grip remains active because part of the card is still bookable-adjacent. This matches the existing `isPastSlot` semantics ("fully past = end has elapsed").

## Verification
- Hover the right edge of a 9 AM appointment at 2 PM today → card should NOT shift left.
- Hover the right edge of a 4 PM appointment at 2 PM today → card SHOULD still shift left.
- Navigate to yesterday → no card shifts on right-edge hover.
- Navigate to tomorrow → all cards shift normally.

## Further enhancement suggestions
1. **Match cursor to affordance** — when `isPastAppointment`, set `cursor: default` (or `cursor: pointer` for click-to-open only). Today's `cursor-pointer` on the right gutter implies write-action that's blocked.
2. **Past-card visual weight** — past appointments could carry a subtle `opacity-90` and reduced ring saturation so the eye reads them as "history" vs "live." Pairs naturally with the grey past-time overlay already in place.
3. **A11y: `aria-disabled` + tooltip on the right grip** — for keyboard users who can't perceive the missing shrink, expose "Cannot book in the past" via tooltip when the gutter receives focus.
4. **Past slot click → read-only details** — `isPastSlot` currently shows "Unavailable" badge; consider a click handler that opens a read-only "what happened here" mini-panel (no-show/walk-in/gap analysis). Turns dead UI into intelligence surface — aligns with the lever doctrine.

## Prompt coaching
Strong prompt — you described the **symptom** (hover shifts left on past appts), the **mental model** (visual cue means "schedulable"), and the **fix** (remove the cue where it's a lie). Two micro-improvements for next time:
- **Specify the time boundary up front**: "past = end_time before now" vs "past = entire prior days" vs "past = anything before the current time indicator." I had to infer this from the existing `isPastSlot` logic. One line ("treat fully-elapsed appts as past, same as the grey overlay") would have removed a planning round-trip.
- **Name the doctrine link** when relevant: this is a Schedule-unified-mechanics issue (timezone-safe past detection). Calling it out ("keep this consistent with how isPastSlot is computed") gives the AI a precise anchor instead of a search.