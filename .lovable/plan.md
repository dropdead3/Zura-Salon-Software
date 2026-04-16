

## Prompt review

Strong, focused prompt. You correctly scoped it to "tighter window layouts only — don't touch full-screen." A tighter version next time: "On the Schedule header at 1024–1366px widths, the dark header bar wraps awkwardly — filter icons get stranded and the stacked selectors create dead space. Tighten the layout so it stays compact without breaking the wide layout."

## Diagnosis

At 1296px (your screenshot), the top dark header bar wraps because the right-side cluster (filters + 280px-wide stacked selectors) can't fit alongside the left toggles and center date. Result:

1. **Left group** (Day/Week + Shifts + Date) sits on row 1.
2. **Filter icons** (`CalendarFiltersPopover`, Users, Drafts) get stranded on row 2 because they're glued to the stacked selectors.
3. **Stacked Location + Staff selectors** take 240px on row 2.
4. **Center date** (THURSDAY APRIL 16, 2026) gets pushed to the far right of row 1, looking detached.

The secondary nav bar is now fine at this width.

## Fix Plan

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`. No changes to wide-layout behavior.

### 1. Top dark header bar (lines 154–477)

**Restructure the right cluster** so filter icons sit inline with the selectors instead of getting stranded:

- Group filter icons (`CalendarFiltersPopover`, Assistant Blocks, Drafts, Today's Prep) into their own `flex shrink-0` row that sits **above** the stacked selectors on the right side at < `xl` widths, or inline at `xl+`.
- At **< xl (1280px)**: collapse the stacked Location + Staff selectors to a **single row, side-by-side**, each `w-[180px]`, so the whole right cluster fits on one line with the center date.
- At **xl+ (1280px+)**: keep current stacked 240px/280px behavior.
- Reduce the center date from two lines to a single compact line at < `xl` (e.g., "Thu, Apr 16, 2026") so it competes less for horizontal space.

### 2. Center date block (lines 250–258)

- At < `xl`: render a single-line condensed format `Thu · Apr 16, 2026` using `font-display text-sm`.
- At `xl+`: keep the current two-line eyebrow + headline format.

### 3. Selector widths (lines 343, 374)

- Replace `w-[240px] lg:w-[280px]` with `w-[180px] xl:w-[240px] 2xl:w-[280px]`.
- This gives 3 graceful breakpoint steps instead of 2.

### 4. Header container (line 154)

- Keep `flex-wrap` as a safety net but reduce wrap likelihood by making the right cluster narrower.
- Add `xl:flex-nowrap` so the wide layout (which currently works) is explicitly preserved.

### 5. Selector stacking direction (line 331)

- At < `xl`: `flex-row gap-2` (side-by-side) instead of `flex-col gap-1.5`.
- At `xl+`: keep `flex-col` stacked behavior.

## Acceptance checks

1. At **1296px** (current viewport), the dark header bar fits on a single row: left toggles · center date · filter icons + side-by-side selectors.
2. At **1024–1280px**, the layout still degrades gracefully — selectors may wrap below if needed but filter icons stay grouped with them.
3. At **1440px+ (wide)**, layout is **identical** to current — stacked 280px selectors, two-line center date, no visual change.
4. Secondary nav bar (bottom row) is untouched.
5. No logic, state, or behavior changes — purely responsive Tailwind classes.

## Out of scope

- No changes to secondary navigation bar.
- No changes to Day/Week toggle, Shifts toggle, or any popover/dropdown logic.
- No changes to the staff filter level chip work.
- No changes to wide-layout (≥1440px) appearance.
- No font, color, or token changes.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx`

