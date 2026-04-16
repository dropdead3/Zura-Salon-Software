

## Diagnosis

The stylist dropdown already has code to render a level chip (`Level 1`, `Level 2`, etc.) next to each name (lines 454-464 of `ScheduleHeader.tsx`), but **it never appears** because the resolution logic is broken:

- DB now stores slug-based levels (e.g. `studio-artist`, `emerging`) — confirmed via query: `SELECT DISTINCT stylist_level FROM employee_profiles` → `studio-artist`.
- Code calls `getLevelNumber(s.stylist_level)` which only matches the legacy regex `/LEVEL\s*(\d+)/i` ("LEVEL 2 STYLIST" format) → returns `null` for slug values.
- With `levelNum = null`, the lookup `levelSlugByNumber.get(-1)` fails, `dbLevel = undefined`, `levelLabel = null`, chip never renders.

That's why the screenshot shows only names + utilization %, no level pill.

## Fix

Resolve each stylist's level by **slug-first** (matching directly against `activeLevels` from `useStylistLevels`), and only fall back to the legacy `LEVEL N` regex if the slug doesn't match. The display label becomes `Level {N}` based on the level's position in `activeLevels` (display_order), giving the user-requested "Level 1, Level 2, etc." labeling.

### Changes (single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`)

Replace the per-row level resolution block (~lines 425-438) with:

```tsx
// Resolve by slug first (current DB format), fall back to legacy "LEVEL N STYLIST"
const dbLevel = s.stylist_level
  ? activeLevels.find((l) => l.slug === s.stylist_level)
    ?? activeLevels.find((l) => l.slug === levelSlugByNumber.get(getLevelNumber(s.stylist_level) ?? -1))
  : undefined;
const levelIdx = dbLevel ? activeLevels.findIndex((l) => l.id === dbLevel.id) : -1;
const levelLabel = levelIdx >= 0 ? `Level ${levelIdx + 1}` : null;
const levelColor = levelIdx >= 0 ? getLevelColor(levelIdx, activeLevels.length) : null;
```

Result: every stylist with a configured level shows a colored `Level N` chip (Level 1, Level 2, …) inline between the name and the utilization %. Stylists with no level assigned show no chip (unchanged behavior).

### Out of scope

- No DB schema changes
- No changes to `useStylistLevels` or `levelPricing.ts` utilities
- No changes to the location dropdown or other filters
- No layout/spacing changes — chip slot already exists

### Acceptance checks

1. Open Schedule → click staff filter → each stylist row shows `Level N` pill matching their configured level
2. Pill color matches the stone-to-gold `getLevelColor` progression
3. Stylists with no level still render cleanly (just name + %)
4. Selection, sort, and "All / With Appointments" toggles unchanged

