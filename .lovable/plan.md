

## Diagnosis

The Schedule page **secondary navigation bar** (the row containing `« Week`, `‹ Day`, `Today + 7 quick days`, `Day ›`, `Week »`, `Jump`) overflows horizontally on narrow viewports. From the screenshot, "Wed" gets clipped and the right-side `Day ›` / `Week »` / `Jump` group spills past the rounded card edge.

Root causes in `ScheduleHeader.tsx` lines 479–623:

1. The bar uses `flex justify-between` with **three competing groups** that all want their natural width.
2. The center group renders **7 quick day buttons** (`min-w-[64px] px-3.5`) + a `min-w-[72px]` Today button = ~520px of forced minimum width.
3. The left/right nav groups use full text labels (`Week`, `Day`) instead of being icon-compact.
4. No `flex-wrap`, no `overflow-x-auto`, no responsive collapsing.
5. The top dark header bar also gets tight: 280px-wide stacked location/staff selectors + filters + center date can crowd at this width, but the visible spill in the screenshot is the secondary bar.

## Fix Plan

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`

### Secondary nav bar (lines 479–624)

1. Add `min-w-0 gap-2` and `overflow-hidden` to the outer flex container.
2. **Left group** (`«Week` / `‹Day`): keep visible at all sizes, but at `< lg` render icon-only buttons (drop the "Week"/"Day" text, keep tooltip).
3. **Center group** (Today + 7 quick days):
   - Wrap in `flex-1 min-w-0 overflow-x-auto scrollbar-none` so it scrolls horizontally inside its track when the viewport is tight, instead of pushing siblings off-screen.
   - Reduce per-button minimum: `min-w-[56px] px-2.5` from `min-w-[64px] px-3.5`.
   - Reduce Today button to `min-w-[64px] px-3` from `min-w-[72px] px-4`.
   - Add `shrink-0` to each button so they don't squish.
   - At `< md`, reduce quick days from 7 → 5 visible (still scrollable to the rest).
4. **Right group** (`Day›` / `Week»` / `Jump`):
   - Add `shrink-0`.
   - At `< lg`, hide button text labels and show icon-only.
   - At `< md`, collapse `Jump` into the same icon-only treatment.

### Top dark header bar (lines 154–477) — light pass

- Add `flex-wrap gap-y-2` to the outer header row so the right-side stacked Location/Staff selectors wrap below the center date instead of squeezing.
- Reduce the stacked selectors from fixed `w-[280px]` to `w-[240px] lg:w-[280px]`.
- Add `min-w-0 truncate` to the center date block so it never forces overflow.

### Acceptance checks

1. At 1296px CSS width (current viewport), no horizontal overflow on either bar.
2. At 1024px width, secondary bar still shows left/right navigation; center days scroll horizontally if needed.
3. At 768px+, top header wraps stacked selectors below the date row cleanly.
4. All buttons remain clickable and reachable via keyboard.
5. No change to logic, state, or behavior — purely layout/responsive classes.

### Out of scope

- No changes to color tokens, fonts, or design-token usage.
- No changes to Day/Week toggle, Shifts toggle, location/staff selectors' open/close logic.
- No changes to the calendar filters popover.
- No changes to navigation handlers (`goToToday`, `goToNextDay`, etc.).

### File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx`

