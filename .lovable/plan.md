
## Prompt review

Strong directional prompt — you diagnosed the real problem (density is structural, not just visual) and proposed a clean architectural fix (scope week view to a single stylist). Good instinct to kill the slider rather than keep patching it.

Tighter framing for next time: specify how the user *switches* between stylists in week view (dropdown? prev/next arrows? clicking a name?). Right now I'll infer a stylist selector dropdown in the header — but if you wanted arrow nav or a sidebar list, calling it out upfront saves a round trip.

## Diagnosis

Current week view in `src/components/dashboard/schedule/WeekView.tsx` (or equivalent) renders all staff × 7 days, producing the density problem. The slider was a workaround. Real fix: week view becomes a **single-stylist, 7-day** view — exactly like a personal weekly calendar.

Files in scope:
- `src/pages/dashboard/Schedule.tsx` — owns view state, slider state, localStorage hydration, default stylist selection on view switch.
- `src/components/dashboard/schedule/ScheduleHeader.tsx` — remove slider UI; add stylist selector (week-view only).
- `src/components/dashboard/schedule/WeekView.tsx` (or wherever week grid lives) — render single stylist's 7-day column layout instead of staff × day matrix.

## Plan

**1. Remove the day-width slider entirely**
- Delete slider markup, props, and `weekDayWidth` state/handlers from `ScheduleHeader.tsx`.
- Delete `weekDayWidth` state, localStorage hydration, and clamping logic from `Schedule.tsx`.
- Remove the `weekDayWidth` prop from `WeekView` and any consumers.
- Leave the localStorage key orphaned (harmless); no migration needed.

**2. Scope week view to a single stylist**
- Add `selectedWeekStylistId: string | null` state in `Schedule.tsx`, persisted to localStorage per location.
- When view switches to `week`: auto-select the **first stylist of the selected location** (sorted by display order / name, matching day view's stylist ordering source of truth).
- When location changes while in week view: re-auto-select first stylist of the new location.
- When stylist list loads/changes and current selection is no longer valid: fall back to first stylist.

**3. Stylist selector in header (week view only)**
- In `ScheduleHeader.tsx`, conditionally render a stylist `<Select>` dropdown when `view === 'week'`, positioned where the slider used to be (right of Day/Week toggle).
- Dropdown lists all stylists for the current location (same source as day view columns).
- Selecting a stylist updates `selectedWeekStylistId`.
- Hidden in day view.

**4. Refactor week grid layout**
- `WeekView` now renders: 7 day columns (Mon–Sun of the selected week) for the **single selected stylist**.
- Time gutter on the left (sticky), 7 day-column headers on top (sticky), appointments laid out in the correct day column at correct vertical time positions.
- Columns can now use comfortable widths (e.g., `flex-1` filling viewport, or a sensible `minmax(180px, 1fr)` grid) — no horizontal scroll needed at typical viewports.
- Empty states: if no stylist selected (edge case during load), show "Select a stylist to view their week."
- Preserve: current-time indicator, day boundaries, click-to-create, drag-to-reschedule, sticky time gutter.

**5. Mobile behavior**
- Week view on `<md`: stylist selector remains (compact dropdown). Single-stylist layout actually works better on mobile than the old multi-stylist grid did.

## Acceptance checks

1. Slider gone from header; no `weekDayWidth` references remain in Schedule files.
2. Switching to week view auto-selects the first stylist of the current location.
3. Stylist dropdown appears in header only in week view; selection updates the grid.
4. Changing location in week view resets to that location's first stylist.
5. Week grid shows 7 day columns for one stylist, comfortably fitting the viewport without horizontal scroll at ≥1280px.
6. Day view unchanged.
7. Selection persists across reloads (localStorage), scoped per location.

## Follow-up enhancements (not in scope)

- Prev/next stylist arrows flanking the dropdown for quick scanning.
- Keyboard shortcut (`j`/`k` or `[`/`]`) to cycle stylists.
- "Compare two stylists" mode as a separate view variant.
