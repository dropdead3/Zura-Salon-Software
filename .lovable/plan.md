

## Prompt review

Strong follow-up — you noticed a specific edge case (the "Unavailable" badge fires above the indicator line) and provided a zoomed screenshot that makes the boundary mismatch obvious. Teaching note: calling out *which* artifact spills (the badge/cursor vs the gray fill) helps target the fix faster, since we already fixed the visual gray overlay in the prior round. Micro-improvement: "the unavailable badge appears on the slot the time bar is currently inside" would have pinned the root cause in one sentence.

## Diagnosis

The visual gray overlay is now pixel-aligned to the line (prior fix). What's still wrong is the **slot interaction logic**:

```ts
// DayView.tsx:781 and WeekView.tsx:495
const isPastSlot = slotMins < dayNowMins;
```

A slot becomes "past" the moment `now` crosses its **start**, not its **end**. So at 1:53 PM:
- 1:45–2:00 slot: `slotMins = 105 < 113` → marked past
- The line sits at 1:53 (mid-slot), but hovering the slot above the line shows the "UNAVAILABLE" badge and `cursor-not-allowed`

This is exactly what your screenshot shows — the badge appears for a slot whose end is still in the future.

## Fix

Change the past-slot test from "start has passed" to **"end has passed"**:

```ts
// DayView.tsx
const isPastSlot = showCurrentTime && (() => {
  const slotMins = hour * 60 + minute;
  return slotMins + slotInterval <= dayNowMins;  // slot fully in past
})();

// WeekView.tsx
const isPastSlot = isCurrentDay && (() => {
  const slotMins = slot.hour * 60 + slot.minute;
  return slotMins + slotInterval <= wkNowMins;   // slot fully in past
})();
```

`slotInterval` is already 15 in both files (the slot grid step). This makes the current slot (the one the line cuts through) **interactive** — bookable from the line forward — while everything strictly before it remains unavailable.

## Acceptance checks

1. The "UNAVAILABLE" badge no longer appears on the slot containing the current-time line.
2. Hovering above the line still shows "UNAVAILABLE" + `cursor-not-allowed`.
3. Hovering at or below the line shows the slot-time badge + pointer cursor.
4. The gray overlay still ends exactly at the line (untouched).
5. Both Day and Week views behave identically.
6. As `nowMinutes` ticks past a slot's end, that slot flips to unavailable on the next tick.

## Files to touch

- `src/components/dashboard/schedule/DayView.tsx` — line ~781, change `<` to `+ slotInterval <=`.
- `src/components/dashboard/schedule/WeekView.tsx` — line ~495, same change.

## Further enhancement suggestions

- Add a one-line comment next to each check explaining the "fully past" semantic so future refactors don't regress.
- Consider extracting `isSlotFullyPast(slotMins, nowMins, slotInterval)` into `schedule-utils.ts` for a single source of truth (mirrors the recent `getCurrentTimeRenderMetrics` consolidation).
- Sweep AgendaView and any drag-validation logic for the same `<` pattern in case it exists there too.

