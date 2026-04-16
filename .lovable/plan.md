

## Prompt review

Direct and clearly scoped — "fix this layout at this size." A more precise version: "At ~1256px, the Schedule dark header wraps into an unintentional 2-row layout with the date floating far right and filter icons stranded on row 2. Redesign the <xl layout as an intentional compact structure."

## Diagnosis (1256px viewport, below xl breakpoint)

The current `flex-wrap` causes an accidental break:
- **Row 1**: Day/Week toggle + stacked Shifts/Date pills on the left, `THU · APR 16` floating far right
- **Row 2**: 3 filter icons + two 180px selectors side-by-side, spread across full width

Problems:
1. Center date is disconnected — it floats to the far right of row 1 because `justify-between` pushes it there
2. Filter icons are stranded on row 2 with too much space between them and the selectors
3. The overall layout looks broken rather than intentionally compact

## Fix Plan

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`

### Restructure the dark header for `< xl` as an intentional 2-row layout

**Row 1** (full width, `justify-between`):
- Left: Day/Week toggle + Shifts pill + Date pill (all inline, horizontal)
- Right: Condensed date `THU · APR 16`

**Row 2** (full width, `justify-between`):
- Left: Filter icons (CalendarFilters, Assistant Blocks, Drafts, Today's Prep) grouped tight
- Right: Location selector + Staff selector side-by-side

### Implementation

1. **Change the outer container** from `flex-wrap` to a responsive structure:
   - At `< xl`: use `flex flex-col gap-2` — two deliberate rows
   - At `xl+`: keep current single-row `flex-nowrap justify-between`

2. **Row 1 (< xl)**: A `flex items-center justify-between` div containing:
   - Left: Day/Week toggle + Shifts + Date pills (inline, `flex-row gap-3`)
   - Right: Condensed date display

3. **Row 2 (< xl)**: A `flex items-center justify-between` div containing:
   - Left: Filter icon buttons grouped in a `flex gap-1`
   - Right: Location + Staff selectors side-by-side

4. **At xl+**: Render the existing single-row layout unchanged — all elements in one `flex-nowrap justify-between` row with the two-line centered date

### Key detail

The Shifts + Date pills should NOT stack vertically at this width — there's enough room for them inline next to Day/Week at 1256px. The vertical stacking was premature.

## Acceptance checks

1. At **1256px**: Two clean, intentional rows — no floating date, no stranded icons
2. At **≥ 1280px (xl)**: Single-row layout identical to current wide design
3. All popovers, tooltips, and handlers still work correctly
4. No changes to the secondary nav bar (bottom row)
5. No font, color, or token changes

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx`

