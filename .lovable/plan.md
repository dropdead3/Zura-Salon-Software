
## Prompt review

Clear and visual — the screenshots show exactly what you want (red pill is the "before"-style example; purple line + 1:43 PM is your target). Teaching note: explicitly saying "ghost = translucent purple, not solid" and "in the time-gutter area to the left" would have removed two assumptions. I'll proceed with: translucent purple background (`bg-primary/15`), purple text, purple ring, vertically centered on the line, positioned to the **left of the dot** so it sits over the time-label gutter.

## What's there now

- **DayView** (`src/components/dashboard/schedule/DayView.tsx`, ~line 893): renders the line + dot only — no time label at all.
- **WeekView** (`src/components/dashboard/schedule/WeekView.tsx`, ~line 597): renders line + dot + a **solid purple** label on the **right** of the dot.

Both use the shared snapped `currentTimeLinePx` from `getCurrentTimeRenderMetrics`.

## Fix

Add a small reusable formatter inline (or use `formatTime12h` from `schedule-utils` after converting `nowMinutes` → `HH:MM` string) and render a ghost pill positioned to the **left** of the dot, vertically centered on the line.

Pill styling (matches "ghost" + brand):
- `bg-primary/15` translucent purple fill
- `text-primary` purple text
- `ring-1 ring-primary/30` subtle outline
- `backdrop-blur-sm` for the glassy ghost feel
- `text-[10px] font-medium px-2 py-0.5 rounded-full`
- positioned `absolute right-1 -translate-y-1/2 top-0` inside the indicator wrapper, so it sits in the time-gutter to the left of the dot

### DayView changes (~line 893–904)
- Wrap the indicator content in a `relative` container so the pill can be absolutely positioned relative to the line.
- Add the ghost pill to the **left** of the dot using `right-2` (since the indicator spans the full track, "left of the dot" = positioned with `right` from the dot's anchor, or simpler: render the pill at `left: -<offset>` relative to the column wrapper).
- Cleanest: render the pill at `style={{ right: '100%' }}` on the dot's wrapper, with a small `mr-1` so it sits just outside the column track in the time-gutter area.

### WeekView changes (~line 605–613)
- Replace the existing solid right-side label with the same ghost pill positioned on the **left** (`right: '100%'` + `mr-1`), removing the current `left-3 -top-2.5 bg-primary text-primary-foreground` styling.

### Shared helper
- Add a tiny `formatMinutesAs12h(mins: number)` to `src/lib/schedule-utils.ts` (DRY — used by both views) so the time string isn't duplicated as an IIFE.

## Acceptance checks

1. Both Day and Week views show a translucent purple pill with the current time (e.g. `1:43 PM`) just left of the purple dot.
2. The pill is vertically centered on the purple line — no clipping above/below.
3. Pill updates each minute (already handled by `useOrgNow` ticking `nowMinutes`).
4. In Week view, only today's column shows the pill (existing `isCurrentDay` gate).
5. Pill doesn't overlap appointments — sits in the time-gutter area to the left of the column track.
6. Looks crisp at 100% and 200% zoom.

## Out of scope

- Restyling the dot or line.
- MonthView / AgendaView (no time-of-day line there).
- Animations on the pill (could be a follow-up if you want a soft pulse).

## Files to touch

- `src/lib/schedule-utils.ts` — add `formatMinutesAs12h(mins)` helper.
- `src/components/dashboard/schedule/DayView.tsx` — add ghost pill left of the dot.
- `src/components/dashboard/schedule/WeekView.tsx` — replace right-side solid label with the same ghost pill on the left.

## Further enhancement suggestions

- Add a subtle pulse animation on the dot to reinforce "live now" status.
- Mirror this pill on any other live-time surfaces (e.g., Zura Dock prep timeline) so the "current time" treatment is consistent platform-wide.
