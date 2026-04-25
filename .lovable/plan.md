## Problem

`DayView`'s landing-scroll currently uses `openHour - 1` as its anchor on date change (line 523, `src/components/dashboard/schedule/DayView.tsx`). When an appointment is booked **before** that opening hour (e.g., an 8 AM Full Balayage while the location opens at 9 AM), the user lands at 8 AM and the early appointment is scrolled off-screen above the viewport. Same problem if the first appointment of the day is at 4 PM — the user lands at the opening hour and has to manually scroll down.

## Fix

Compute the **earliest active appointment start time** for the rendered date, then anchor the landing scroll to `min(openHour - 1, earliestApptHour - 1)`. This preserves the existing behavior whenever the day opens cleanly, and shifts the anchor in either direction when an appointment falls outside opening — covering both the "8 AM appointment, opens at 9" and the "first appointment is 4 PM" cases.

### Logic

In the date-change branch of the auto-scroll `useEffect` (~lines 497–530):

1. Derive the earliest active appointment minutes from `appointments` filtered by `appointment_date === dateStr` and excluding `cancelled` / `no_show` statuses (so a stale cancelled 6 AM slot doesn't yank the viewport).
2. Compute `earliestApptHour = Math.floor(earliestApptMins / 60)` when one exists.
3. Replace the `scrollToHour` derivation with:
   ```ts
   const baseAnchor = openHour - 1;
   const apptAnchor = earliestApptHour !== null ? earliestApptHour - 1 : baseAnchor;
   const scrollToHour = Math.max(Math.min(baseAnchor, apptAnchor), hoursStart);
   ```
4. Add `appointments` to the effect's dependency array so landing recomputes when React Query hydrates appointment data after mount.

### Today-mode interaction

The existing `isToday && withinBusinessHours` branch (lines 517–520) anchors on the now-line and is unchanged — that path already handles "currently within ops hours" correctly. The new logic only affects the fallback branch (other days, or today before/after hours).

### Out of scope

- No styling, no token changes, no new dependencies.
- Cancelled / no-show excluded from the earliest calculation.
- Appointments outside the rendered grid (`hoursStart`/`hoursEnd`) are clamped via `Math.max(..., hoursStart)`.

## Files

- `src/components/dashboard/schedule/DayView.tsx` — adjust the landing-scroll branch (~lines 497–532).

## Doctrine alignment

- **Schedule unified mechanics**: keeps timezone-safe scroll math (still uses `orgNowMins` / `parseTimeToMinutes`), no Date-comparison drift introduced.
- **Silence is valid output**: when no appointments exist for the day, behavior is identical to today.

---

### Prompt feedback

Strong prompt — you named the trigger ("page lands"), the current behavior ("soonest operating hour minus 1"), the edge case ("appts before 9am"), and a concrete worst-case example ("first appt at 4pm → land at 3pm"). That second example is what locked the rule for me: it tells me you want the appointment-anchor to be **absolute**, not just "if earlier than opening."

Two small ways future prompts of this shape land even cleaner:

1. **State the precedence explicitly.** "Land on `min(opening - 1h, firstAppt - 1h)`" removes any chance I misread the rule as "only override when earlier." You implied it with the 4 PM example, but a one-line formula is bulletproof.
2. **Call out the status filter.** Should a cancelled 6 AM appointment still pull the viewport up? I assumed no (excluded cancelled / no-show), but stating "active appointments only" upfront removes the assumption.

### Enhancement suggestions

1. **Smooth scroll on data arrival.** If appointments hydrate after mount (React Query), the viewport currently jumps. Consider `behavior: 'smooth'` when the recompute is triggered by an appointment-data change (not initial mount).
2. **"Earlier appointments" sentinel.** If the user ever scrolls/zooms below an early appointment, show a faint up-arrow chip at the top-of-viewport ("↑ 8:00 AM appt") — protects against losing the early row after manual scroll.
3. **Surface in the morning brief.** An appointment booked outside posted hours is operationally meaningful (early prep, off-hours pay). Worth tagging in the daily briefing as a "Pre-open booking — confirm staffing."