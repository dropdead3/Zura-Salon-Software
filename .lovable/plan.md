

# Align Backroom KPI Tiles with Dashboard Command Center Cards

## Problem
The backroom overview KPI strip cards (Chemical Cost, Waste Rate, Reweigh Compliance, Stockout Alerts, Budget) use `tokens.kpi.tile` which applies `rounded-xl border border-border bg-card` — giving them heavy borders and a solid card background. The main dashboard command center cards (Executive Summary KPI tiles) use a lighter, subtler style: `rounded-lg border-border/50 bg-muted/30` with hover state `bg-muted/60`.

## Changes

### 1. Update `tokens.kpi.tile` in `design-tokens.ts`
Change from:
```
rounded-xl border border-border bg-card p-4 flex flex-col gap-1
```
To match the dashboard command center pattern:
```
rounded-lg border border-border/50 bg-muted/30 p-4 flex flex-col gap-1
```

This is the single token that controls both the backroom `KpiTile` and `BudgetKpiTile`. Updating it brings all KPI tiles system-wide into alignment with the dashboard command center style.

### 2. Verify no regressions
The `tokens.kpi.tile` token is used in:
- `BackroomDashboardOverview.tsx` — KpiTile and BudgetKpiTile (the cards in the screenshot)

Other KPI-style cards (ExecutiveSummaryCard) use inline classes rather than this token, so they won't be affected.

### Files to edit
1. `src/lib/design-tokens.ts` (one line change)

