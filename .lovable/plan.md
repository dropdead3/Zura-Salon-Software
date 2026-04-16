

## Add capacity % and stylist level to staff dropdown

### What

In the staff multi-select dropdown on the Schedule header (`ScheduleHeader.tsx`), each stylist row will show:
- **Stylist level label** (e.g., "Level 2") as a small muted chip on the right
- **Today's capacity %** (booked-time utilization for the current date) as a small badge next to the level

Layout per row:
```
[checkbox]  Alexis Heasley            [Level 2]  [78%]
```

### How

**1. Extend the `stylists` prop type in `ScheduleHeader.tsx`** to optionally carry `stylist_level` and a precomputed `utilization` number per stylist.

**2. Compute utilization in `Schedule.tsx`** (the parent already has `appointments`, `allStylists`, `currentDate`, and hours). Lift the existing logic from `DayView.tsx` lines 477–506 into a shared helper `src/lib/schedule-utilization.ts` that returns `Map<userId, number>`. Both `Schedule.tsx` (for the dropdown) and `DayView.tsx` (existing column sort) will consume the helper — single source of truth, no duplication.

**3. Resolve level label** via `useStylistLevels()` in `ScheduleHeader.tsx`. Build a `slug → label` map (e.g., `level-2` → `"Level 2"`). Stylists with no level show no chip.

**4. Render** in the dropdown row (lines 377–389):
```tsx
<button …>
  <Checkbox … />
  <span className="flex-1 text-left truncate">{name}</span>
  {levelLabel && (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded', levelColor.bg, levelColor.text)}>
      {levelLabel}
    </span>
  )}
  <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right">
    {util}%
  </span>
</button>
```
Use existing `getLevelColor()` from `@/lib/level-colors.ts` for level chip styling (per project doctrine — never hardcode level colors). Capacity badge uses muted tone; no new color tokens.

**5. Popover width** — bump from `w-[280px]` to `w-[320px]` to fit the extra chips cleanly.

### Files touched

- `src/lib/schedule-utilization.ts` *(new)* — shared utilization calculator
- `src/pages/dashboard/Schedule.tsx` — compute utilization map, pass to header
- `src/components/dashboard/schedule/ScheduleHeader.tsx` — extend prop type, render level + % per row, useStylistLevels
- `src/components/dashboard/schedule/DayView.tsx` — refactor existing inline calc to call the shared helper (no behavior change)

### Out of scope

- WeekView dropdown / weekly capacity aggregation (current dropdown shows day-level state, matching what `DayView` displays)
- Changing the trigger button label
- Sorting the dropdown by capacity (kept alphabetical for predictability)

