## Diagnosis

The "Cannot schedule in the past" tooltip and `cursor-default` adjustments **are in the code** (lines 145, 159–160 of `src/components/dashboard/schedule/DayView.tsx`) — but they only fire when `isPastSlot === true`.

Today, `isPastSlot` is gated by `showCurrentTime`:

```tsx
// line 1042
const isPastSlot = showCurrentTime && (() => {
  const slotMins = hour * 60 + minute;
  return slotMins + slotInterval <= dayNowMins;
})();
```

`showCurrentTime = isDayToday(date)` — meaning it's `true` only when the viewed date is today. When you navigate to **a prior day** (which is exactly what the screenshot shows — fully-past appointments marked "Done"), `showCurrentTime` is `false`, so `isPastSlot` is `false` for every slot. Result: the slot behaves like any future open slot — pointer cursor, time-of-day tooltip, click fires.

This is the same `date < todayDate` boundary already correctly applied to past *appointments* on line 1121 (via `useOrgNow().todayDate`). The slot logic just wasn't extended to mirror it.

## Fix

Update the `isPastSlot` derivation in `src/components/dashboard/schedule/DayView.tsx` (~line 1042) to mark a slot as past when **either**:
- the viewed `date` is before `todayDate` (entire day is history), **or**
- the viewed `date` is today and the slot's end time has elapsed (existing rule)

```tsx
const isPastSlot = (date < todayDate) || (showCurrentTime && (() => {
  const slotMins = hour * 60 + minute;
  return slotMins + slotInterval <= dayNowMins;
})());
```

This brings slot-past detection into parity with appointment-past detection (line 1121), so on any prior day:
- ✅ tooltip reads "Cannot schedule in the past"
- ✅ cursor is `cursor-default`
- ✅ `onClick` no-ops (already gated)
- ✅ AppointmentCard hover-shrink stays suppressed (already wired)

## Files changed

- `src/components/dashboard/schedule/DayView.tsx` (one-line change to `isPastSlot` derivation)

## Why the previous fix missed this

The badge/cursor changes were scoped to `isPastSlot` without re-checking the upstream definition. The appointment-side fix correctly used `todayDate`; the slot-side fix inherited the older `showCurrentTime`-only logic. The two surfaces drifted apart.

---

### Further enhancement suggestions

1. **Extract a single `isPastDateOrTime(date, slotMins?)` helper** in `useOrgNow` so slot- and appointment-side past detection can never drift again. One source of truth, two consumers.
2. **Visual weight on past days** — apply a faint hatch or background shift to the entire day's column when `date < todayDate` so the "history" framing is obvious before the user even hovers.
3. **Past-day banner** — when navigating to any prior day, show a small inline note ("Viewing past day — read-only") to set expectations before the user attempts to interact.

**Prompt coaching:** Excellent prompt — you named the symptom precisely and called out *which* surfaces were missing. One micro-tighten: noting "I'm on a prior day, not today" up front would have pointed me straight at the date boundary instead of having me re-read the slot code. The mental model "today vs prior day" is the actual axis, and naming it accelerates triage.