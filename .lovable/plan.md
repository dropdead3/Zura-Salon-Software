

# Backroom Control Tower — Implementation Plan

## Existing Infrastructure

All required data sources already exist as projection hooks:
- `useInventoryRiskProjections` / `useHighRiskInventory` — inventory stockout risk
- `useBackroomExceptions` — mixing exceptions, waste anomalies
- `useAppointmentProfitSummary` — profitability warnings, margin outliers
- `useStaffBackroomPerformance` — staff performance signals
- `useForecastSummary` / `useStockoutAlerts` — predictive demand, urgent reorders

No new tables or database changes required. This is a pure aggregation UI layer over existing projections.

## Architecture

```text
Existing projection hooks (5 sources)
  → useControlTowerAlerts (aggregation + priority scoring)
  → BackroomControlTower component (alert list + summary)
```

## Implementation

### 1. Alert Engine: `src/lib/backroom/control-tower-engine.ts`

Pure functions, no DB calls.

**`ControlTowerAlert` interface:**
- `id`, `category` (inventory | exception | profitability | waste | staff | reorder)
- `priority` (critical | high | medium | informational)
- `title`, `description`
- `metrics` (key-value pairs for display)
- `entityType`, `entityId` (linked entity)
- `suggestedAction` (text)
- `actionRoute` (navigation path)
- `createdAt`

**`buildControlTowerAlerts(sources)` function:**
Maps each data source into `ControlTowerAlert[]`:

| Source | Alert type | Priority logic |
|---|---|---|
| High-risk inventory (critical) | Inventory risk | Critical if depletion < 1 day, High if < 3 days |
| High-risk inventory (high) | Inventory risk | High |
| Open exceptions (critical severity) | Exception | Critical |
| Open exceptions (warning severity) | Exception | High |
| Margin outliers | Profitability | High if margin < 20%, Medium otherwise |
| Staff waste rate > threshold | Waste/Staff | High if > 15%, Medium if > 10% |
| Urgent reorders from forecast | Reorder | High |

**`sortAlertsByPriority(alerts)` function:**
Sorts by priority tier (critical → informational), then by recency.

### 2. Hook: `src/hooks/backroom/useControlTowerAlerts.ts`

- Composes the 5 existing hooks (inventory risk, exceptions, profit summary, staff performance, forecast summary)
- Passes their data into `buildControlTowerAlerts()`
- Returns sorted alerts + summary counts per priority
- Uses `select` or derived query — no extra DB calls
- `staleTime: 60_000` (inherits from slowest source)

### 3. UI Components: `src/components/dashboard/backroom/control-tower/`

**`BackroomControlTower.tsx`** — Main container:
- Priority summary bar: 4 count badges (Critical / High / Medium / Info)
- Optional category filter chips
- Scrollable alert list
- Empty state when no alerts

**`ControlTowerAlertCard.tsx`** — Individual alert card:
- Left: priority indicator (colored bar)
- Title + description
- Metrics row (key-value chips)
- Action button linking to relevant workspace (uses `useNavigate`)
- Follows `tokens.card.*` standards

**`ControlTowerSummaryBar.tsx`** — Top summary:
- 4 compact metric badges with counts per priority level
- Critical count pulses if > 0

**`index.ts`** — Barrel exports

### 4. Integration

Wire `BackroomControlTower` into owner/manager dashboards as a prominent card. It aggregates existing data without adding new queries.

## Build Order

1. `control-tower-engine.ts` — pure alert mapping + priority scoring
2. `useControlTowerAlerts.ts` — composition hook
3. UI components (summary bar, alert card, main container)

## Edge Cases

| Case | Handling |
|---|---|
| No alerts | Empty state: "All systems clear" |
| Missing projection data (loading) | Show skeleton; don't show partial alerts |
| False positives (stale projections) | Alerts show `last_forecast_at` timestamp; user can dismiss via exception workflow |
| All sources error | Show error state with retry |
| Too many alerts | Cap display at 20, show "+N more" with expand |

