

# Projection + Read Model Architecture for Zura Backroom

## Current State

The system already has two projection layers in place:

1. **`inventory_projections`** — Derived from `stock_movements` via trigger. Works. Fields: `on_hand`, `allocated`, `on_order`, `available`.
2. **`mix_session_projections`** — Derived from `mix_session_events` via trigger. Works. Fields: session-level counters (bowl counts, weight, cost, flags).

The existing `mix_bowls`, `mix_bowl_lines`, `reweigh_events`, `waste_events` tables already serve as de facto projection/read-model tables — they are the materialized state that the UI queries. Multiple hooks (`useMixBowls`, `useMixBowlLines`, `useBackroomAnalytics`, `useContributionMargin`, `useDepleteMixSession`) query these tables directly.

**What's missing:** Bowl-level and line-level projections driven by events, checkout usage projections, inventory risk projections, staff performance projections, and service profitability projections. Several hooks also scan raw bowl/line tables with ad-hoc aggregation instead of reading pre-computed values.

---

## Architecture Overview

```text
Source Events                    Projections (DB trigger or edge fn)         UI Queries
──────────────                   ───────────────────────────────────         ──────────
mix_session_events        →      mix_session_projections (exists)      →     MixSessionManager
                          →      mix_bowl_projections (NEW)            →     LiveBowlCard
                          →      mix_bowl_line_projections (NEW)       →     AddProductToBowl
                          →      checkout_usage_projections (NEW)      →     Checkout panel
                          →      client_formula_history (exists)       →     Client profile

stock_movements           →      inventory_projections (exists)        →     Inventory screens
                          →      inventory_risk_projections (NEW)      →     Low-stock alerts

backroom_exceptions       →      (already queryable, no new proj)      →     Exception inbox

Periodic edge fn / cron   →      staff_backroom_performance (NEW)      →     Owner dashboard
                          →      service_profitability_snapshots (NEW) →     Profitability reports
                          →      backroom_analytics_snapshots (exists) →     Dashboard cards
```

---

## Required Projections

### Already Implemented (no changes needed)
- **`mix_session_projections`** — session-level counters, updated by trigger on `mix_session_events`
- **`inventory_projections`** — on_hand/allocated/on_order per product+location, updated by trigger on `stock_movements`
- **`backroom_analytics_snapshots`** — daily aggregates, updated by edge function
- **`backroom_exceptions`** — already a queryable entity, not a raw event stream

### New Projections to Create

#### 1. `mix_bowl_projections`
Purpose: Fast bowl-state view without scanning events.

```sql
CREATE TABLE public.mix_bowl_projections (
  mix_bowl_id UUID PRIMARY KEY REFERENCES mix_bowls(id) ON DELETE CASCADE,
  mix_session_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  bowl_number INTEGER DEFAULT 1,
  purpose TEXT,
  current_status TEXT DEFAULT 'open',
  line_item_count INTEGER DEFAULT 0,
  dispensed_total NUMERIC(10,2) DEFAULT 0,
  estimated_cost NUMERIC(10,4) DEFAULT 0,
  leftover_total NUMERIC(10,2) DEFAULT 0,
  net_usage_total NUMERIC(10,2) DEFAULT 0,
  has_reweigh BOOLEAN DEFAULT false,
  last_event_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Updated by: trigger on `mix_session_events` (same trigger, extended logic for bowl-level events like `line_item_recorded`, `bowl_sealed`, `reweigh_captured`).

Consistency: **Near-immediate** (trigger).

#### 2. `checkout_usage_projections`
Purpose: Pre-computed checkout charge summary per appointment service.

```sql
CREATE TABLE public.checkout_usage_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  appointment_id UUID,
  appointment_service_id UUID,
  mix_session_id UUID,
  client_id UUID,
  total_dispensed_weight NUMERIC(10,2) DEFAULT 0,
  total_dispensed_cost NUMERIC(10,4) DEFAULT 0,
  service_allowance_grams NUMERIC(10,2),
  overage_grams NUMERIC(10,2) DEFAULT 0,
  overage_charge NUMERIC(10,4) DEFAULT 0,
  requires_manager_review BOOLEAN DEFAULT false,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, mix_session_id)
);
```

Updated by: service-layer call on `session_completed` event. Reads finalized bowl/line data, applies allowance policy, computes overage.

Consistency: **Near-immediate** (computed synchronously during session completion).

#### 3. `inventory_risk_projections`
Purpose: Low-stock alerts, depletion forecasting.

```sql
CREATE TABLE public.inventory_risk_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id TEXT,
  current_on_hand NUMERIC DEFAULT 0,
  avg_daily_usage NUMERIC(10,4) DEFAULT 0,
  projected_depletion_date DATE,
  stockout_risk_level TEXT DEFAULT 'none',
  recommended_order_qty NUMERIC DEFAULT 0,
  open_po_quantity NUMERIC DEFAULT 0,
  last_forecast_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, product_id, location_id)
);
```

Updated by: periodic edge function (daily) that reads `inventory_projections` + recent `stock_movements` usage rates.

Consistency: **Eventually consistent** (daily refresh acceptable).

#### 4. `service_profitability_snapshots`
Purpose: Per-service contribution margin for owner reporting.

```sql
CREATE TABLE public.service_profitability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  location_id TEXT,
  appointment_id UUID,
  appointment_service_id UUID,
  staff_id UUID,
  service_name TEXT,
  service_revenue NUMERIC(10,2) DEFAULT 0,
  product_cost NUMERIC(10,4) DEFAULT 0,
  overage_revenue NUMERIC(10,4) DEFAULT 0,
  waste_cost NUMERIC(10,4) DEFAULT 0,
  contribution_margin NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Updated by: edge function on session completion or daily batch. Reads checkout projection + revenue data.

Consistency: **Eventually consistent**.

#### 5. `staff_backroom_performance`
Purpose: Stylist/assistant analytics aggregates.

```sql
CREATE TABLE public.staff_backroom_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  location_id TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  mix_session_count INTEGER DEFAULT 0,
  manual_override_rate NUMERIC(5,2) DEFAULT 0,
  reweigh_compliance_rate NUMERIC(5,2) DEFAULT 0,
  avg_usage_variance NUMERIC(5,2) DEFAULT 0,
  waste_rate NUMERIC(5,2) DEFAULT 0,
  total_dispensed_weight NUMERIC(10,2) DEFAULT 0,
  total_product_cost NUMERIC(10,4) DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, staff_id, location_id, period_start, period_end)
);
```

Updated by: periodic edge function (daily). Aggregates from `mix_session_projections` + `mix_session_events`.

Consistency: **Eventually consistent**.

---

## Event-to-Projection Update Map

| Event Source | Projection Updated | Mechanism | Timing |
|---|---|---|---|
| `mix_session_events` INSERT | `mix_session_projections` | DB trigger (exists) | Synchronous |
| `mix_session_events` INSERT (bowl-level) | `mix_bowl_projections` | DB trigger (extend existing) | Synchronous |
| `mix_session_events` `session_completed` | `checkout_usage_projections` | Service layer in completion handler | Synchronous |
| `mix_session_events` `session_completed` | `client_formula_history` | Service layer (exists) | Synchronous |
| `stock_movements` INSERT | `inventory_projections` | DB trigger (exists) | Synchronous |
| `stock_movements` INSERT | `inventory_risk_projections` | Edge function (daily) | Eventually consistent |
| Completed sessions (batch) | `service_profitability_snapshots` | Edge function (daily) | Eventually consistent |
| Completed sessions (batch) | `staff_backroom_performance` | Edge function (daily) | Eventually consistent |
| Completed sessions (batch) | `backroom_analytics_snapshots` | Edge function (exists) | Eventually consistent |

---

## Consistency Model

**Near-immediate (trigger or synchronous service call):**
- `mix_session_projections`
- `mix_bowl_projections`
- `checkout_usage_projections`
- `inventory_projections`
- `client_formula_history`

**Eventually consistent (daily edge function):**
- `inventory_risk_projections`
- `service_profitability_snapshots`
- `staff_backroom_performance`
- `backroom_analytics_snapshots`

---

## Idempotency Strategy

- **Trigger-based projections**: Use `ON CONFLICT ... DO UPDATE` with additive/subtractive logic keyed on event type. The `sequence_number` UNIQUE constraint on `mix_session_events` prevents duplicate event insertion at the source.
- **Edge function batch projections**: Each run deletes and re-inserts for the target period (full rebuild per period window). This is inherently idempotent.
- **Offline replay**: `idempotency_key` on `mix_session_events` rejects duplicates. The trigger only fires on successful INSERT, so projections never double-count.
- **Checkpoint**: `last_event_sequence` on `mix_session_projections` tracks the highest processed event. Bowl projections will track `last_event_at`.

---

## Conflict Handling

| Scenario | Strategy |
|---|---|
| Two devices emitting for same session | `sequence_number` UNIQUE rejects duplicates; trigger uses additive math |
| Late offline events arriving | Replayed via idempotency_key; if accepted, trigger updates projection normally |
| Manager override after checkout projection | Re-run checkout projection calculation; `last_calculated_at` updated |
| Count adjustment after stockout warning | Next daily risk projection run picks up new `inventory_projections` values |
| Projection corruption | Call `rebuild_inventory_projection()` (exists) or reprocess events for session projections |

---

## Projection Rebuild Strategy

All projections are rebuildable:

1. **`inventory_projections`**: `rebuild_inventory_projection(org, product, location)` function exists. Sums all `stock_movements`.
2. **`mix_session_projections`** + **`mix_bowl_projections`**: New rebuild function that replays all `mix_session_events` for a session in sequence order, applying the same trigger logic.
3. **Batch projections** (risk, profitability, performance): Simply re-run the edge function for the target date range.

A new `rebuild_mix_session_projection(session_id)` DB function will be created that truncates + replays.

---

## Frontend Query Boundaries

| UI Surface | Queries | Does NOT query |
|---|---|---|
| MixSessionManager (active mixing) | `mix_session_projections`, `mix_bowls`, `mix_bowl_lines` | `mix_session_events` |
| LiveBowlCard | `mix_bowl_projections` (new), `mix_bowl_lines` | raw events |
| Checkout panel | `checkout_usage_projections` | raw bowls/lines |
| Inventory workspace | `inventory_projections` | `stock_movements` |
| Low-stock alerts | `inventory_risk_projections` | raw movements |
| Exception inbox | `backroom_exceptions` | raw events |
| Client formula history | `client_formula_history` | raw events |
| Owner dashboard | `backroom_analytics_snapshots`, `service_profitability_snapshots`, `staff_backroom_performance` | raw events |
| Audit/history views (only) | `mix_session_events`, `stock_movements` | — |

---

## Indexing Recommendations

```sql
-- mix_bowl_projections
CREATE INDEX idx_mix_bowl_proj_session ON mix_bowl_projections(mix_session_id);

-- checkout_usage_projections
CREATE INDEX idx_checkout_proj_appt ON checkout_usage_projections(appointment_id);
CREATE INDEX idx_checkout_proj_session ON checkout_usage_projections(mix_session_id);

-- inventory_risk_projections
CREATE INDEX idx_inv_risk_org ON inventory_risk_projections(organization_id, stockout_risk_level);

-- service_profitability_snapshots
CREATE INDEX idx_svc_profit_org ON service_profitability_snapshots(organization_id, created_at);

-- staff_backroom_performance
CREATE INDEX idx_staff_perf_org ON staff_backroom_performance(organization_id, period_start);
```

---

## Implementation Order

1. **Migration**: Create `mix_bowl_projections`, `checkout_usage_projections`, `inventory_risk_projections`, `service_profitability_snapshots`, `staff_backroom_performance` tables with RLS + indexes
2. **Extend trigger**: Update `update_mix_session_projection_on_event()` to also upsert `mix_bowl_projections` for bowl-level events
3. **Checkout projection**: Add projection computation to session completion handler
4. **Rebuild functions**: Create `rebuild_mix_session_projection()` and `rebuild_mix_bowl_projection()`
5. **Daily edge function**: Extend `generate-backroom-snapshots` to also compute risk, profitability, and staff performance projections
6. **Refactor hooks**: Update `useBackroomAnalytics`, `useContributionMargin`, `useDepleteMixSession` to read from projections instead of ad-hoc aggregation

---

## Risks & Unknowns

| Risk | Mitigation |
|---|---|
| Trigger complexity growing (session + bowl projections in one trigger) | Split into separate triggers if needed; monitor execution time |
| Checkout projection stale if session re-opened | Invalidate checkout projection on any post-completion event |
| Edge function timeout for large orgs | Paginate by location; process in batches |
| Backward compat during migration | Existing tables (`mix_bowls`, `mix_bowl_lines`) remain as-is; new projections supplement, don't replace |

