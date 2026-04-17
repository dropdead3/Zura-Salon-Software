
## Prompt review

Sharp refinement — you spotted that "in session" and "remaining" are *temporally bound to right now*. They only make sense for today. Showing "0 in session" when viewing next Tuesday is meaningless noise. Good operator instinct.

Tighter framing for next time: clarify what "total appts" should reflect when viewing a non-today day — appts *for that viewed date* (most useful) vs. still today's count (confusing). I'll go with the first since it matches the visible calendar.

## Current behavior

In `ScheduleActionBar.tsx`:
- `todayAppointmentCount` is passed in from `Schedule.tsx` and always reflects *today's* count regardless of which day is viewed.
- `inSessionCount` and `remainingCount` are computed from the `appointments` prop and shown whenever `view === 'day'`.

## Proposed behavior

When in day view:
- **Viewing today**: show all three (📅 N appts · ▶ N in session · ⏱ N remaining) — unchanged.
- **Viewing any other day**: show only 📅 N appts, where N = appointments scheduled *for the viewed date* (excluding cancelled/no_show). Hide "in session" and "remaining" entirely.

When in week/agenda view: unchanged (only total appts shown, as today).

## Plan

**1. Pass `currentDate` (the viewed date) to `ScheduleActionBar`**
- `Schedule.tsx` (line ~1046): add `currentDate={currentDate}` prop. Already in scope from the page state.

**2. Compute "is viewing today" + viewed-date count in the action bar**
- Add `currentDate?: Date` to `ScheduleActionBar` props.
- Derive `isViewingToday = isSameDay(currentDate, new Date())` using `date-fns`.
- When `view === 'day'` and `!isViewingToday`:
  - Compute `viewedDateCount` from the `appointments` prop, filtered by `appointment_date === format(currentDate, 'yyyy-MM-dd')` and excluding `cancelled` / `no_show`.
  - Render only the 📅 pill with this count + label "appts" (or "appt" if 1).
  - Skip rendering the in-session and remaining pills.
- When `view === 'day'` and `isViewingToday`: existing behavior (all three pills, total uses `todayAppointmentCount`).

**3. No change to `todayAppointmentCount` semantics**
- Keep the existing prop for the today-case. Add a parallel computed value for non-today days inside the component — cleaner than reshaping the parent prop.

## Acceptance checks

1. Day view, viewing today: shows 📅 N appts · ▶ N in session · ⏱ N remaining (unchanged).
2. Day view, viewing any other date (past or future): shows only 📅 N appts, where N reflects appointments on *that* viewed date.
3. "In session" and "remaining" pills are completely hidden (not just zeroed) when viewing a non-today day.
4. Week and agenda views: unchanged behavior.
5. Navigating between days updates the count live.
6. Singular vs. plural label ("1 appt" vs. "2 appts") — keep current "appts" plural for simplicity unless already pluralized.
7. No layout shift on the FAB or right-side controls.
8. Cancelled and no-show appointments are excluded from the viewed-date count (consistent with the "remaining" definition).

**Files to modify:**
- `src/pages/dashboard/Schedule.tsx` (pass `currentDate` prop)
- `src/components/dashboard/schedule/ScheduleActionBar.tsx` (compute viewed-date count, conditionally render pills based on `isSameDay(currentDate, today)`)
