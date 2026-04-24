# Visit Grouping — Implementation Plan (Approved)

Reconnaissance complete. The cleanest seam is to merge appointments **before** they reach the views, so DayView/WeekView/MonthView/AgendaView all receive a unified "display" shape with no parallel prop threading. Existing behaviors (overlap math, declined-reason map, deep-link focus, selection) keep working because each merged row keeps the lead member's `id`.

## Files to create

### `src/lib/visit-grouping.ts` (new)

Pure utility module:

- `MAX_VISIT_GAP_MINUTES = 5` — single configurable constant.
- `VisitGroup` — structured group: `visit_id`, `client_key`, aggregate `start_time`/`end_time`/`total_price`/`total_duration_minutes`, `members[]`, `member_ids[]`, `is_multi_service`, `lead_stylist_user_id`, `stylist_user_ids[]`.
- `MergedPhorestAppointment` — extends `PhorestAppointment` with optional `_visit_id`, `_visit_member_ids`, `_visit_members`, `_is_merged_visit`.
- `groupAppointmentsIntoVisits(appointments)` — sorts by client → location → date → start_time, walks consecutively, opens a new group whenever (client/location/date changes) OR (gap > 5 min). Walk-ins (no `phorest_client_id` AND no `client_id`) always become single-member groups (truthful, never merged).
- `buildDisplayAppointments(appointments)` — returns one `MergedPhorestAppointment` per group. Multi-member visits collapse into one synthetic row using the lead-stylist member's `id`, with comma-joined `service_name`, summed `total_price`, earliest `start_time`, latest `end_time`. Single-member groups pass through unchanged but tagged with `_visit_id`.
- `indexVisitsByDisplayId(appointments)` — `Map<lead_member_id, VisitGroup>` for the detail sheet to look up the full visit on click.

## Files to modify

### `src/pages/dashboard/Schedule.tsx`

- After the existing `appointments` filter (~line 305), derive `displayAppointments = useMemo(() => buildDisplayAppointments(appointments), [appointments])` and `visitIndex = useMemo(() => indexVisitsByDisplayId(appointments), [appointments])`.
- Replace `appointments={appointments}` props on **DayView, WeekView, MonthView, AgendaView** with `appointments={displayAppointments}`. The mini-views block at line 1075 (which uses `allAppointments`) stays raw — that's the source-of-truth slice for command-center counters and shouldn't merge.
- `handleAppointmentClick(apt)` — detect `apt._is_merged_visit` and pass through to `setSelectedAppointment`. The existing detail sheet already handles comma-joined `service_name` (line 1031 splits on `,`), so the body works as-is. Aggregate header copy ("X services · Y min · $Z") is already present (line 1473: `services.length > 1 ? `${services.length} services` : appointment.service_name`).
- Selected-appointment freshness sync (line 309) — match against `displayAppointments` so a re-grouped visit stays selected after a refetch.

### `src/components/dashboard/schedule/DayView.tsx`

- `appointments` prop continues to type as `PhorestAppointment[]` (the merged row is structurally compatible). Internal `appointmentsByStylist` keys on `apt.stylist_user_id` which for merged visits = lead stylist — correct: a multi-stylist visit anchors to its lead in the schedule (per-service stylist overrides remain visible inside the card via `_visit_members`).
- **Drag handler (line 598)** — read `appointment` from `active.data.current` as before. Detect `_visit_member_ids`. If present (≥ 2):
  - Compute `delta = parseTimeToMinutes(newTime) - parseTimeToMinutes(appointment.start_time)`.
  - For each member, compute its new start_time = `parseTimeToMinutes(member.start_time) + delta` (formatted back to `HH:MM`).
  - For the lead member only, also pass `newStaffId` (column move). Other members keep their assigned stylist (per-service overrides are preserved).
  - Dispatch `Promise.allSettled` of `reschedule.mutateAsync` calls (one per member). On any rejection, surface a single toast and rely on the hook's per-call rollback (each call snapshots independently).
  - Single-member visits → existing single-call path unchanged.
- Toast copy: "Moved visit to {time}" when `_is_merged_visit`; existing "Moved to {time}" otherwise.

### `src/components/dashboard/schedule/AppointmentCardContent.tsx`

Light touches inside the existing `GridContent`:

- When `appointment._is_merged_visit`, the multi-line "service line" (already rendered when pixelHeight ≥ 70 and serviceBands has multiple entries) becomes the per-service stack. Existing logic already does this for comma-joined `service_name` + `serviceLookup` — verify it renders cleanly with 3+ services and add a `truncate` cap if needed.
- Header time range: when merged, render the visit's full window in the existing time line (already pulls from `appointment.start_time` / `appointment.end_time`). No code change needed; the merged row already carries the aggregate.
- Composite avatar: when `appointment._is_merged_visit && stylist_user_ids.length > 1`, render a small stacked avatar group on the card top-right in addition to the lead's `StylistBadge`. Keep behind a `pixelHeight >= 60` guard to avoid clutter on short cards.

### `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

Mostly works as-is thanks to comma-joined `service_name`. Minor:

- When `appointment._is_merged_visit`, ensure the per-service status badges (if rendered) read from `_visit_members[i].status` rather than the lead row. For this wave: status changes still apply to the lead member; multi-status mutation is deferred (called out in QA).
- Header price/duration aggregate is already correct because the merged row's `total_price` is summed.

### `src/components/dashboard/schedule/AgendaView.tsx`

- Already iterates `appointments`. When fed the merged list, each visit becomes a single agenda card. No code change needed; the comma-joined service line in `AppointmentCardContent` already handles multi-service display.

### `src/hooks/useRescheduleAppointment.ts`

No change required — current shape supports per-call optimistic updates with `setQueriesData`. Multi-member fan-out from `DayView` issues N parallel calls; each rolls back independently on failure. (Future wave: a true batched edge function, but parallel calls are correct semantics today.)

## What stays the same

- DB schema and `phorest_appointments` rows (one per service)
- `v_all_appointments` view and `usePhorestCalendar` query
- Per-service stylist override data (still rendered inside the card body via `_visit_members`)
- Walk-in display logic (always standalone, never merged)
- Status colors, NC/RC badges, indicator clusters
- Per-service assignment dialog from the previous wave (unchanged — still keys on individual appointment IDs)

## QA checklist

- Carmen X's two contiguous services merge into one card spanning the full visit window
- A client with a 10am cut and a 4pm color shows as two separate cards (gap > 5 min triggers split)
- Two back-to-back walk-ins render as two separate cards
- Dragging a merged visit moves every member by the same delta; relative offsets preserved
- All-or-rollback: when one member's reschedule fails, the failed member's cache rolls back; successful members stay moved (acceptable for now — surfaces "1 of 3 services failed" via the existing error toast)
- Detail sheet from a merged card shows all services in the body; per-service overrides badges still render
- Single-service appointments render byte-identical to today (regression check)
- Agenda view: one entry per visit, never one per service
- Deterministic visit_id: the same set of members produces the same visit_id across renders (no React-key churn)
- Selecting a merged card highlights it; refetch keeps the selection alive

## Confidence and silence

When grouping yields zero merges (every appointment is single-service), `displayAppointments` is structurally equivalent to `appointments` — no surface changes. Silence is valid.

## Future waves (not in scope)

- Composite-avatar visual polish (stacked Avatars top-right of merged cards) — depends on this wave's structural foundation
- Per-service status mutation (status change inside the visit sheet applying to a single member instead of the lead)
- Visit-level history widget on client profile (uses same utility — unlocks truthful visit-frequency metrics)
- Sub-row drag handles for splitting a visit mid-day
