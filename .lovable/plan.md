
## Prompt review

Strong, intuitive prompt — you diagnosed the symptom ("looks insane"), proposed a concrete UX pattern (slider thumb), and described the expected behavior (widen + scroll horizontally). Excellent product instinct.

Tighter framing for next time: state where the slider should live ("in the schedule header, right side"), and whether the value should persist across sessions. Right now I'll infer: header placement, persisted to localStorage so the operator's preferred density survives reloads.

## Diagnosis

`WeekView.tsx` uses `grid-cols-[70px_repeat(7,1fr)]` on both the header row and the time grid. With 7 days squeezed into ~1400px (minus sidebar/time gutter), each column gets ~190px — too narrow once 5+ overlapping appointments stack. Cards collide, labels truncate to one or two characters, and the visual becomes the "insane" state in your screenshot.

The container also has `overflow-x-hidden`, which prevents any horizontal scrolling even if columns were wider.

## Fix

**1. Add a "Day Width" slider control**
- New `weekDayWidth` state in `Schedule.tsx`, persisted to `localStorage` (`schedule.weekDayWidth`), default `auto` (current fit-to-width behavior).
- Slider range: `120px` (compressed) → `400px` (spacious), step `20px`, plus a special "Fit" position at the far left that returns to the current `1fr` behavior.
- Renders only when `view === 'week'` — placed in `ScheduleHeader.tsx` to the right of the Day/Week/Shifts toggle group, as a compact pill: icon (`StretchHorizontal`) + slider + width readout.
- Pass `weekDayWidth` as a prop into `WeekView`.

**2. Switch `WeekView` to a fixed-width-per-column layout when stretched**
- When `weekDayWidth === 'auto'`: keep `grid-cols-[70px_repeat(7,1fr)]` (today's behavior).
- When `weekDayWidth` is a number: switch to `grid-cols-[70px_repeat(7,var(--day-w))]` with `--day-w: ${weekDayWidth}px` set via inline style on both the header row AND the time-grid row (so they stay aligned column-for-column).
- Wrap the inner grid container in a horizontal scroll: change the outer scroll container from `overflow-x-hidden` to `overflow-x-auto` when stretched.

**3. Sticky time gutter**
- The 70px time-label column should remain visible as the user scrolls horizontally. Add `sticky left-0 z-[15] bg-card` to the time-labels column and `sticky left-0` to the empty header spacer cell. This keeps hour labels readable at any horizontal scroll offset.

**4. Sticky day headers (already sticky vertically)**
- The header row is already `sticky top-0 z-20` — no change needed for vertical scroll. With horizontal scroll added, it scrolls horizontally with the grid (correct behavior).

**5. Default width heuristic**
- On first load (no localStorage value), keep `auto`. Operators only opt into stretching when they hit congestion, which preserves the current calm default for low-volume days.

## Files

- `src/pages/dashboard/Schedule.tsx` — add `weekDayWidth` state + localStorage persistence; pass to `ScheduleHeader` and `WeekView`.
- `src/components/dashboard/schedule/ScheduleHeader.tsx` — add the slider pill (visible only in week view); accept `weekDayWidth` + `onWeekDayWidthChange` props.
- `src/components/dashboard/schedule/WeekView.tsx` — accept `weekDayWidth` prop; switch grid template + overflow + sticky time gutter conditionally.

## Acceptance checks

1. Week view in default (`auto`) mode renders identically to today — no visual regression.
2. Sliding the thumb right widens every day column in unison; header columns stay aligned with grid columns.
3. When columns exceed the viewport width, horizontal scrolling becomes available with the time-label gutter sticky on the left.
4. Setting persists across page reloads (localStorage).
5. Slider is hidden in Day view and Shifts view.
6. Vertical scrolling, current-time indicator, and sticky headers continue to work at any width.
7. Mobile (<md): slider hidden; week view falls back to current behavior to avoid cramped controls.

## Follow-up enhancements (not in scope)

- Keyboard shortcuts: `[` and `]` to step width down/up.
- A "Fit to busiest day" auto-suggest button that picks a width based on max overlapping appointments.
- Per-user persistence in `site_settings` instead of localStorage so the preference follows the operator across devices.
