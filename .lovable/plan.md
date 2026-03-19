

# Polish Backroom KPI Strip Cards

## Problem
The five KPI tiles on the Backroom Overview have two alignment issues:
1. **Icons are inconsistent sizes** — currently `w-3.5 h-3.5`, which renders small and can appear uneven across different icon shapes
2. **Values are not vertically aligned** — the label+icon row and value row lack consistent structure, so numbers don't line up across cards

## Changes

### `BackroomDashboardOverview.tsx` — `KpiTile` and `BudgetKpiTile` sub-components (lines 473-521)

1. **Standardize icon size** to `w-4 h-4` across both `KpiTile` and `BudgetKpiTile` for uniform visual weight

2. **Fix vertical alignment** by giving the label row a fixed height (`h-8` / 32px) so the value always starts at the same vertical position regardless of whether the label wraps to one or two lines. Use `items-start` so multi-word labels wrap naturally while the icon stays top-aligned.

3. **BudgetKpiTile "Not set" state** — apply the same `tokens.kpi.value` class so the text occupies the same vertical slot as numeric values in sibling cards

### Summary of style tweaks
- Icon: `w-3.5 h-3.5` → `w-4 h-4`
- Label row: add `min-h-[32px]` to ensure consistent height
- Value: already uses `tokens.kpi.value` (no change needed for KpiTile)
- BudgetKpiTile "Not set": use `tokens.kpi.value` + muted color instead of bare `text-xs`

### Files to edit
1. `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx` — KpiTile and BudgetKpiTile only

