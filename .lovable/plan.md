

# Fix KPI Tile Style to Match Platform Standard

## Problem
The Command Center KPI tiles use a small inline icon next to the label text, which doesn't match the standard KPI card style used elsewhere (e.g., supplier stats, Supply Intelligence). The platform standard places the icon in a rounded icon box (`tokens.card.iconBox`) positioned at the top-right of the tile, with the label and value stacked on the left.

## Reference
The uploaded screenshot shows the correct pattern: label at top-left (uppercase Termina), large value below, icon in a muted rounded box at the top-right, and an optional subtitle beneath the value.

## Changes

### `BackroomDashboardOverview.tsx` — `KpiTile` component (~lines 472-487)

Restructure the layout to match the standard pattern:

```text
Before:
  [icon] [LABEL]
  [VALUE]

After:
  [LABEL]              [icon-box]
  [VALUE]
```

- Wrap the icon in a `w-8 h-8 rounded-lg bg-muted flex items-center justify-center` box (matching `tokens.card.iconBox` pattern)
- Position the icon box at the top-right using a flex row with `justify-between`
- Stack label and value vertically on the left side

### `BudgetKpiTile` component (~lines 489-521)

Apply the same icon-box layout for the Wallet icon, keeping the progress bar below the value.

### Files to edit
1. `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx` — restyle `KpiTile` and `BudgetKpiTile` sub-components

