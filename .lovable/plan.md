

# Predictive Backroom — Implementation Design

## Architecture

```text
Upcoming Appointments (phorest_appointments + appointments)
  → FormulaResolver (reuses SmartMixAssist priority hierarchy)
  → Per-product demand aggregation
  → Compare against InventoryProjection + ReplenishmentEngine
  → Stockout risk alerts + reorder suggestions
  → Dashboard read model
```

Predictive Backroom is a **read-only forecasting layer**. It computes demand projections from existing data sources without creating events or mutating state.

## Data Inputs (all projections, no raw event streams)

| Source | Table | Purpose |
|---|---|---|
| Upcoming appointments | `phorest_appointments`, `appointments` | Schedule for next 1-7 days |
| Client formula history | `client_formula_history` | Priority 1: client's last formula |
| Service recipe baselines | `service_recipe_baselines` | Priority 3: salon defaults |
| Inventory state | `inventory_projections` | Current on-hand quantities |
| Risk projections | `inventory_risk_projections` | Safety stock thresholds |
| Products | `products` | Product metadata, cost, units |

## Forecast Calculation Model

**Per appointment-service:**
1. Resolve expected formula using SmartMixAssist priority hierarchy (client last visit → stylist most used → salon recipe baseline)
2. If no formula found, skip (unmapped service — no chemical demand)
3. Sum `FormulaLine[]` quantities per product across all services in the forecast window

**Output structure:**
```typescript
interface ProductDemandForecast {
  product_id: string;
  product_name: string;
  brand: string | null;
  unit: string;
  predicted_usage_1d: number;   // tomorrow
  predicted_usage_7d: number;   // next 7 days
  current_on_hand: number;
  remaining_after_1d: number;
  remaining_after_7d: number;
  safety_stock: number;
  stockout_risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommended_order_qty: number;
  appointment_count_1d: number;
  appointment_count_7d: number;
}
```

## Inventory Risk Detection

```text
remaining = current_on_hand - predicted_usage
risk =
  remaining <= 0           → 'critical'
  remaining < safety_stock → 'high'
  remaining < 2× safety    → 'medium'
  remaining < 3× safety    → 'low'
  else                     → 'none'
```

Safety stock sourced from `inventory_risk_projections` or computed via `ReplenishmentEngine` defaults.

## Recommended Reorder Logic

When `stockout_risk` is `high` or `critical`, compute reorder quantity using the existing `calculateReplenishment()` engine, substituting `predicted_usage_7d / 7` as the daily usage rate instead of trailing actuals. This gives a forward-looking reorder recommendation.

## Implementation Plan

### 1. Service: `src/lib/backroom/services/predictive-backroom-service.ts`

Core functions:
- `fetchUpcomingServices(orgId, startDate, endDate)` — Query upcoming appointments with service names, client IDs, staff IDs
- `resolveExpectedFormulas(services[])` — Reuse SmartMixAssist's `fetchClientLastFormula`, `fetchStylistMostUsed`, `fetchSalonRecipe` functions (extract into shared utility)
- `aggregateDemandByProduct(formulas[])` — Sum quantities per product_id
- `evaluateStockoutRisk(demand, projections, riskProjections)` — Compare demand vs inventory
- `generateForecast(orgId, locationId?)` — Orchestrator returning `ProductDemandForecast[]`

### 2. Shared formula resolution

Extract the formula resolution logic from `smart-mix-assist-service.ts` into a shared module `src/lib/backroom/services/formula-resolver.ts` that both SmartMixAssist and Predictive Backroom can use. This avoids duplicating the 3-priority query logic.

### 3. Hook: `src/hooks/backroom/usePredictiveBackroom.ts`

- `useDemandForecast(locationId?)` — Returns `ProductDemandForecast[]` for the org
- `useStockoutAlerts(locationId?)` — Filtered to high/critical risk only
- `staleTime: 5 * 60_000` — Forecast is eventually consistent, 5-min cache acceptable

### 4. UI Components: `src/components/dashboard/backroom/predictive-backroom/`

**`DemandForecastTable.tsx`** — Sortable table showing all products with predicted usage, current stock, remaining, risk badge. Columns: Product, Brand, Usage (1d), Usage (7d), On Hand, Remaining, Risk, Reorder.

**`StockoutAlertCard.tsx`** — Compact alert cards for high/critical risk products. Shows product name, predicted depletion, recommended order. Displayed prominently at top of inventory workspace.

**`PredictiveBackroomSummary.tsx`** — Overview card for owner dashboard: total services forecast, products at risk count, top 3 urgent reorders. Compact format for dashboard embedding.

### 5. Integration points

- **Owner dashboard**: Embed `PredictiveBackroomSummary` widget
- **Inventory workspace**: Add `StockoutAlertCard` banner + `DemandForecastTable` tab
- **No database migration needed** — Pure read-only computation from existing tables

## Edge Cases

| Case | Handling |
|---|---|
| No formula history for client or service | Skip — product not included in forecast; show "unmapped services" count |
| Unknown/new service type | Falls through all 3 priorities, excluded from demand |
| Cancelled appointments | Filter `status NOT IN ('cancelled', 'no_show')` |
| Same client, multiple services | Each service resolved independently |
| Product in formula but not in inventory | Show with `current_on_hand: 0`, immediate critical risk |
| No appointments in window | Return empty forecast with zero demand |

## Performance

- All queries use indexed projection tables (no event replay)
- Forecast computed once per hook mount, cached 5 minutes
- Formula resolution batched: fetch all client formulas in one query, all baselines in one query
- For large salons (50+ appointments/day), batch appointment query with `.limit(500)` and process in chunks

## Build Order

1. Extract shared formula resolver from SmartMixAssist
2. Build `predictive-backroom-service.ts`
3. Build `usePredictiveBackroom.ts` hook
4. Build UI components (table, alerts, summary)
5. Wire into owner dashboard and inventory workspace

