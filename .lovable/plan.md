

# Level Economics Analyzer — Final Build Plan

## Summary

Build a **Level Economics Analyzer** as an embedded section within the existing Economics tab of the Stylist Levels Editor. It answers: "For each level, given what they charge and what it costs, am I making money?" Also surface read-only margin indicators on level cards and in staff analytics reports.

## Architecture

```text
Data Sources (all existing — no new tables)
├── stylist_levels          → commission rates, hourly wages
├── service_level_prices    → per-service pricing by level
├── services                → base prices, categories
├── service_recipe_baselines → product cost per service
├── products                → cost_per_gram
├── appointments (90d)      → actual volume by staff × service
├── employee_profiles       → staff → level mapping
└── economics assumptions   → overhead, target margin (from settings)

                    ↓

useLevelEconomicsAnalyzer (new hook)
├── LevelSummary[]          → weighted margin per level
├── ServiceLevelCell[][]    → margin heatmap data
└── StylistSnapshot[]       → per-stylist effective contribution
```

## What Gets Built

### 1. Data Hook — `src/hooks/useLevelEconomicsAnalyzer.ts`

Joins all six data sources. For each level × service combination, computes:

- **Revenue**: level-specific price (from `service_level_prices`, fallback to `services.price`)
- **Product cost**: from `service_recipe_baselines` × `products.cost_per_gram`
- **Commission cost**: price × level's `service_commission_rate`
- **Hourly wage impact**: if `hourly_wage_enabled`, (hourly_wage × hours_per_month) as monthly fixed cost
- **Overhead allocation**: monthly overhead ÷ average monthly services for that level
- **Net margin**: revenue − commission − product cost − overhead share − wage share

Key calculations:
- **Weighted level margin**: uses actual 90-day appointment mix, not theoretical average. A level doing 60% color gets a margin reflecting that mix.
- **Month span**: calculated from actual min/max appointment dates (same fix applied to `useAutoDetectEconomics`), not hardcoded `/3`.
- **Data thresholds**: requires 10+ appointments per service-level combo before showing specific margins. Below that, shows "Insufficient data."

### 2. Bug Fix — `src/hooks/useCommissionEconomics.ts`

Line 154: `data.total / 3` → calculate actual `monthSpan` from min/max appointment dates, matching the fix already in `useAutoDetectEconomics`.

### 3. UI Component — `src/components/dashboard/settings/LevelEconomicsSection.tsx`

Embedded within `CommissionEconomicsTab`, below the existing margin table. Two views:

**Level Summary Cards** (default)
- One card per active level
- Weighted avg margin, revenue per stylist, cost breakdown (commission + product + overhead + wage)
- Status badge: Healthy (≥ target margin) / Tight (≥ 0%) / Underpriced (< 0%)
- Count of services with margin below target
- Responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

**Service × Level Matrix** (expandable drill-down)
- Rows = services (grouped by category), Columns = levels
- Each cell: price, margin %, color-coded (green/amber/red)
- Highlights specific service-level combos that are underpriced
- Sortable by worst margin first
- Minimum 10 appointments threshold — cells below show "—"

**Stylist Snapshots** (collapsible per-person view)
- For each stylist: their level, actual service mix, weighted margin, effective hourly contribution
- Sorted by contribution (lowest first to surface problems)

### 4. Level Card Indicators — `src/components/dashboard/settings/StylistLevelsEditor.tsx`

Small margin indicator on each level card in the Levels tab:
- Green/amber/red dot + "~12% margin" text
- Uses data from the same hook
- Only shows when sufficient data exists (10+ appointments at that level)

### 5. Staff Analytics Surface

Surface per-stylist economics in the staff analytics tab (not team directory cards):
- Effective hourly contribution metric
- Margin status relative to level target
- Reuses `StylistSnapshot` data from the hook

### 6. PDF Export Enhancement — Staff Level Report

Add a "Level Economics" section to the existing `StaffLevelReportPDF`:
- Per-level margin summary row
- Flagged services where margin is below target
- Reuses the same hook data

### 7. Integration with What-If Simulator

When the admin drags commission sliders in the What-If section, the Level Summary Cards update in real time — showing "Level 4 margin drops from 12% to 3% on balayage" instead of just "target revenue goes up."

## Alerts Surfaced

- Services where margin < target at any level (specific callout with level + service name)
- Levels where weighted margin is below target
- **Silent margin erosion**: services where level price falls back to base price but commission rate is higher than base — margin erodes without the admin realizing

## Data Freshness

- Show "Based on [date range], [N] appointments analyzed" header
- If fewer than 50 total appointments for a level, flag as "Limited data — margins may not be representative"
- Data sourced badge: "From your data" vs "Insufficient data" per cell

## Responsive Design

- Summary cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Matrix: horizontal scroll on mobile with sticky service name column
- Stylist snapshots: card layout on mobile, table on desktop

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useLevelEconomicsAnalyzer.ts` | **New** — joins level prices, recipe costs, commission rates, hourly wages, appointments |
| `src/hooks/useCommissionEconomics.ts` | **Fix** — replace hardcoded `/3` with actual monthSpan calculation |
| `src/components/dashboard/settings/LevelEconomicsSection.tsx` | **New** — summary cards + service×level matrix + stylist snapshots |
| `src/components/dashboard/settings/CommissionEconomicsTab.tsx` | **Modified** — import and render `LevelEconomicsSection` below margin table; wire What-If rates into it |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | **Modified** — add margin indicator dot on level cards |
| `src/components/dashboard/settings/StaffLevelReportPDF.ts` | **Modified** — add level economics summary section |

## No New Routes or Database Changes

Embedded within existing Economics tab. All data sources already exist with appropriate RLS.

