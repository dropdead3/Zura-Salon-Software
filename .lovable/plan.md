
## Prompt review

Excellent observation — you spotted a precision mismatch (overlay extends past the indicator line) and the zoomed screenshot makes the gap unmistakable. Teaching note: you correctly identified both the symptom (gray goes too far) and the desired boundary (the time bar). Micro-improvement: mentioning that this happens at 15-min slot boundaries ("the gray seems to fill the whole 15-min slot the current time falls inside") would have pre-confirmed the root cause.

## Diagnosis

The "past" gray is painted at **slot granularity (15 min)** while the current-time bar is painted at **minute precision**. Both files use the same logic:

```ts
const isPastSlot = slotMins < dayNowMins;  // entire slot greys when now passes its start
```

Example: at 1:23 PM, the 1:15–1:30 slot has `slotMins = 75 < 83 = dayNowMins`, so the whole 15-min cell renders `bg-muted/40` — the gray reaches 1:30 even though the indicator sits at 1:23. Visible gap: up to 14 minutes of extra gray below the line.

The current-time line itself is correctly positioned via `currentTimeOffset = (dayNowMins - hoursStart*60) / slotInterval * ROW_HEIGHT` — minute-accurate.

## Fix

Stop painting "past" via per-slot background. Instead, render a **single overlay rectangle** per stylist column (DayView) and per day column (WeekView) whose height equals exactly `currentTimeOffset` px — pixel-aligned to the indicator line.

Concretely:

1. **DayView.tsx**
   - Remove `isPastSlot` from the per-slot `DroppableSlot` render path (slots stay clickable as "available" or "outside hours" only).
   - Inside the stylist column wrapper (the `relative` div at line 763), add a non-interactive overlay positioned `absolute inset-x-0 top-0` with `height: currentTimeOffset` px and `bg-muted/40 pointer-events-none`. Render only when `showCurrentTime && currentTimeOffset > 0`.
   - Keep slot click-handler logic for past slots: re-derive `isPastSlot` inline at click time using `dayNowMins` (so clicks on past slots still no-op / show the "Unavailable" hover badge). The hover badge uses `isPastSlot` — keep that prop, just compute it the same way (still slot-granular for the *label*, which is fine since the badge says "Unavailable" anyway).
   - Actually simpler: keep `isPastSlot` for the slot's interaction/badge behavior, but **remove the `bg-muted/40` background** from the slot itself. The overlay handles the visual. This preserves cursor/click semantics with zero change.

2. **WeekView.tsx**
   - Same surgical change: remove `isPastSlot && 'bg-muted/40'` from the slot's className.
   - In each day column (the one matching `todayInWeek`), render the overlay `absolute inset-x-0 top-0 height: weekCurrentTimeOffset` with `bg-muted/40 pointer-events-none`.
   - Need to confirm where the per-day column wrapper is and that it's `relative` — will verify on read; if not, add `relative`.

3. **Z-index**
   - Overlay sits below appointments (z < 10) and below the current-time line (which is z-30+ typically). Use `z-0` or omit z-index — slot droppables are background, appointments are `z-10`, line is higher. Overlay with no z-index sits above slot bg, below appointments. 

## Acceptance checks

1. On today's view at any minute: the gray ends **exactly** at the purple current-time line (no 1–14 min spillover).
2. The current slot under the line is half-gray, half-clear — pixel-aligned.
3. Past slots remain non-interactive (click no-ops, hover badge still says "Unavailable").
4. Outside-operating-hours diagonal hatching is unaffected.
5. Appointments rendered in the past still display normally on top of the overlay.
6. Refresh the page — overlay updates as `nowMinutes` ticks (every 60s via `useOrgNow`).
7. WeekView: only today's column shows the overlay; other days unaffected.

## Out of scope

- Changing slot granularity or the indicator line styling.
- Touching MonthView or AgendaView (no time-of-day overlay there).
- Changing how past appointments are rendered.

## Files touched

- `src/components/dashboard/schedule/DayView.tsx` — remove past-slot bg class, add per-column past overlay rectangle.
- `src/components/dashboard/schedule/WeekView.tsx` — same treatment for today's column only.
