

# Make Backroom Product Catalog Fully Responsive

## Problem
The card header, alphabet bar, product rows, and filter controls all use rigid horizontal layouts that crunch at narrow widths. The screenshot shows the title wrapping badly and controls overflowing.

## Changes — `BackroomProductCatalogSection.tsx`

### 1. Card Header (lines 294–320)
Stack the title block and action buttons vertically on small screens:
- Wrap in `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`
- Badge + Supply Library button row: `flex items-center gap-2 self-start sm:self-auto`

### 2. Alphabet Bar (lines 335–390)
- Letters: use `flex flex-wrap gap-1` instead of `overflow-x-auto` so letters wrap into 2 rows on narrow screens rather than requiring horizontal scroll
- Reduce letter button size on mobile: `w-6 h-6 sm:w-7 sm:h-7 text-[10px] sm:text-xs`

### 3. Filter Row (lines 458–478)
- Category select: `w-full sm:w-[180px]` so it takes full width on mobile
- Wrap: already uses `flex-wrap`, just needs the select to be flexible

### 4. ProductRow (lines 698–775) — Most Critical
The depletion controls panel (toggle + select + billable + overage) is a dense horizontal bar that breaks on small screens:
- Change outer flex to `flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5`
- Depletion controls: `flex flex-wrap items-center gap-2 sm:gap-3` and remove `shrink-0`
- Select trigger: `w-full sm:w-[120px]`
- Wrap the billable/overage switches into a sub-row that can flow

### 5. BrandProductRow (lines 602–694)
Already fairly responsive with flex-wrap on size chips. Minor tweak:
- Reduce padding on mobile: `p-3 sm:p-4`

### 6. Sticky Add Footer (lines 561–582)
- Stack vertically on narrow: `flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-between`

