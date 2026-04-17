
## Prompt review

Clear, specific request — three discrete metrics with implied placement. Good instinct to scope to day view only, since week view's broader date range makes "in session" / "remaining today" less meaningful at a glance.

Tighter framing for next time: explicitly define each metric's data definition. "In session" could mean `checked_in` only, or `checked_in` + `in_service`. "Remaining" could mean `confirmed` + `pending` (not yet started) or everything not in a terminal state. I'll use the most operationally useful definitions and call them out in acceptance checks so you can flag if they don't match your mental model.

## Definitions (proposed)

Out of today's appointments at the selected location:
- **Total**: existing `todayAppointmentCount` (already shown as "7 appts").
- **In session**: status === `checked_in` (client is physically in the chair).
- **Remaining**: status ∈ {`confirmed`, `pending`, `booked`} — booked but not yet checked in, not cancelled, not no-show, not completed.

Cancelled / no-show / completed are excluded from "remaining" since they're resolved.

## Plan

**1. Pass view mode + computed counts to `ScheduleActionBar`**
- `src/pages/dashboard/Schedule.tsx` (line 1046): add `view={view}` prop. The component already receives the filtered today's appointments, so it can compute the two new counts internally — no need to pass them separately.

**2. Add view-aware count display in `ScheduleActionBar.tsx`**
- Add `view?: 'day' | 'week' | 'agenda'` to props.
- Compute `inSessionCount` and `remainingCount` via `useMemo` from the existing `appointments` prop using the status definitions above.
- Render two new inline pills next to the existing "N appts" indicator, **only when `view === 'day'`**:
  - `<PlayCircle /> {inSessionCount} in session`
  - `<Clock /> {remainingCount} remaining`
- Match the existing muted style (`tokens.body.muted`, `h-4 w-4` icons, `font-medium text-foreground` for the number).
- Hide gracefully when count is 0? → No, show `0` so operators see "all checked out" state explicitly.

**3. Visual treatment**
- Same `flex items-center gap-2 shrink-0` pattern as the existing appt count.
- Separator: a subtle `·` dot or just `gap-4` between the three indicators — use `gap-4` for cleaner look, no dots.
- Icons: `PlayCircle` (in session) and `Clock` (remaining) from lucide-react, both `h-4 w-4`.

## Acceptance checks

1. **Day view only**: the two new indicators appear in day view; hidden in week and agenda views.
2. **Total appts**: unchanged behavior (uses existing `todayAppointmentCount`).
3. **In session**: counts only `checked_in` appointments for today at the selected location.
4. **Remaining**: counts `confirmed` + `pending` + `booked` (not started, not resolved). Excludes `cancelled`, `no_show`, `completed`, `checked_in`.
5. Numbers update live as statuses change (driven by existing query invalidation).
6. Visual hierarchy matches existing "7 appts" indicator — muted icon, foreground number, muted label.
7. No layout shift when counts go to 0 — labels still show.
8. No change to FAB position or action bar right padding.

**Files to modify:**
- `src/components/dashboard/schedule/ScheduleActionBar.tsx` (add view prop, compute counts, render conditionally)
- `src/pages/dashboard/Schedule.tsx` (pass `view` prop)
