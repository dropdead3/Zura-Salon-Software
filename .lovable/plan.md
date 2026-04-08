

# Zura Health Engine — Implemented

## What Was Built

### Edge Function (`calculate-health-scores/index.ts`)
Full rewrite from platform-adoption metrics to business health scoring:
- 7 category calculators: Revenue, Client, Retention, Utilization, Team Performance, Operational Consistency, Inventory/Cost
- Data profile detection (POS, Payroll, Inventory, Accounting)
- Dynamic weight normalization — missing categories redistribute proportionally
- Per-location scoring with org rollup
- Deterministic formulas with benchmark comparisons

### Database
- `location_health_scores` table (per-location scoring)
- `health_score_weights` table (configurable category weights)
- `data_profile` JSONB column added to `organization_health_scores`

### Client Hooks (`useHealthEngine.ts`)
- `useOrgHealthScore` / `useLocationHealthScores` / `useHealthHistory`
- `useDataProfile` / `useRecalculateHealth`
- Risk tier utilities and constants

### UI Components (`health-engine/`)
- `HealthScoreDial` — SVG ring gauge, color-coded by tier
- `HealthCategoryCard` — Expandable with metrics, diagnostics, recommendations
- `DataCompletenessIndicator` — Shows connected data sources
- `LocationHealthDrilldown` — Per-location comparison
- `HealthDashboard` — Main container orchestrating all components

### Integration
- Operations tab → Health Engine subtab in Analytics Hub
- Passed `organizationId` through OperationsTabContent

## Phase 2+ (Future)
- Profitability category (requires accounting integration)
- AI-powered insight generation layer
- Command Center pinnable health dial
- Scheduled automatic recalculation
