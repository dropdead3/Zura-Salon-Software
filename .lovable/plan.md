
## Prompt review

Clear and atomic. You named the elements (Location + Stylist dropdowns), the desired behavior (stacked), and the scope (all widths). Tighter version: "Stack the Location and Stylist selectors vertically at all widths in the Schedule header — they're currently side-by-side at <xl."

## Diagnosis

In `src/components/dashboard/schedule/ScheduleHeader.tsx`, the recent restructure put the Location + Stylist selectors in a `flex-row` group inside the `< xl` Row 2 wrapper (right side). At the current 1291px viewport, they sit side-by-side, making each selector cramped.

Per your screenshot, you want them stacked vertically — Location pill on top, Stylist pill below — at every width.

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`. Pure className change.

### Change selectors group from `flex-row` to `flex-col` at all widths

- Current: `flex flex-row gap-2` (or similar)
- New: `flex flex-col gap-2 items-stretch`

This applies at every breakpoint — including `xl+` — so the wide-screen layout will also stack them. If you want to preserve inline behavior at `xl+` and only stack `<xl`, say so and I'll scope it. Per your instruction ("at all widths"), I'll stack everywhere.

### Width consistency

Both selectors should match width when stacked. Use a fixed `w-[200px]` (or current width) on both triggers so the stacked column is visually aligned.

## Acceptance checks

1. At 1291px: Location pill sits above Stylist pill in a vertical column.
2. At ≥ 1280px (xl): Same vertical stacking — no horizontal layout.
3. Both pills are the same width when stacked.
4. No change to the filter icons group, popovers, or handler logic.
5. No change to the secondary nav bar.

## Out of scope

- Filter icons, Day/Week toggle, Shifts/Date pills, condensed date — unchanged.
- Secondary nav bar — unchanged.
- Color/token system — unchanged.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx`
