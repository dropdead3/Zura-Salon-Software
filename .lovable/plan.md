

# Phase 5: Backroom Analytics & Intelligence Layer

## Current State

**Data already captured (Phases 1-4):**
- `mix_sessions` — per-appointment sessions with status, staff, location, timestamps
- `mix_bowls` / `mix_bowl_lines` — product-level dispensed quantities with weights
- `waste_events` — 5 categories with quantities, linked to sessions/bowls
- `reweigh_events` — leftover capture with `captured_via` (manual/scale)
- `stock_movements` — append-only ledger with `reference_type`, `reference_id`, `location_id`
- `service_recipe_baselines` — expected usage per service/product
- `checkout_usage_charges` — overage billing with approval workflow
- `products` — `quantity_on_hand`, `cost_price`, `reorder_level`
- `useServiceCostsProfits` — appointment-based service cost/profit (uses `services.cost`)
- `useShrinkageSummary` — stock count variance
- `useUsageVariance` — per-session actual vs baseline comparison
- `ai-business-insights` edge function — existing AI pattern with caching to `ai_business_insights` table

**Key gaps:**
1. No aggregated backroom metrics (chemical cost per service, waste %, reweigh compliance)
2. No ghost loss detection (theoretical vs actual inventory divergence)
3. No assistant performance tracking (who mixed, speed, accuracy)
4. No inventory days-remaining projection
5. No role-scoped backroom dashboards
6. No exception inbox for anomalies
7. No AI layer for backroom-specific insights

---

## 1. Schema Changes

### 1a. `backroom_analytics_snapshots` (daily materialized metrics)

Stores pre-computed daily rollups to avoid expensive real-time aggregation.

```sql
CREATE TABLE IF NOT EXISTS public.backroom_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  snapshot_date DATE NOT NULL,
  -- Session metrics
  total_sessions INT DEFAULT 0,
  completed_sessions INT DEFAULT 0,
  avg_session_duration_minutes NUMERIC DEFAULT 0,
  -- Cost metrics
  total_product_cost NUMERIC DEFAULT 0,
  total_service_revenue NUMERIC DEFAULT 0,
  avg_chemical_cost_per_service NUMERIC DEFAULT 0,
  -- Waste metrics
  total_waste_qty NUMERIC DEFAULT 0,
  total_dispensed_qty NUMERIC DEFAULT 0,
  waste_pct NUMERIC DEFAULT 0,
  waste_by_category JSONB DEFAULT '{}',
  -- Reweigh compliance
  bowls_requiring_reweigh INT DEFAULT 0,
  bowls_reweighed INT DEFAULT 0,
  reweigh_compliance_pct NUMERIC DEFAULT 0,
  -- Variance
  sessions_with_variance INT DEFAULT 0,
  total_overage_qty NUMERIC DEFAULT 0,
  total_underage_qty NUMERIC DEFAULT 0,
  -- Ghost loss
  theoretical_depletion NUMERIC DEFAULT 0,
  actual_depletion NUMERIC DEFAULT 0,
  ghost_loss_qty NUMERIC DEFAULT 0,
  ghost_loss_cost NUMERIC DEFAULT 0,
  -- Staff
  staff_metrics JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, snapshot_date)
);
-- RLS: org_member SELECT, org_admin INSERT/UPDATE
-- Indexes: organization_id, snapshot_date, location_id
```

### 1b. `backroom_exceptions` (exception inbox)

Anomaly events surfaced for manager review.

```sql
CREATE TABLE IF NOT EXISTS public.backroom_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT,
  exception_type TEXT NOT NULL,
    -- 'high_waste', 'ghost_loss', 'missing_reweigh', 'variance_outlier',
    -- 'no_baseline', 'cost_spike', 'unresolved_session'
  severity TEXT NOT NULL DEFAULT 'warning',  -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  description TEXT,
  reference_type TEXT,  -- 'mix_session', 'product', 'staff'
  reference_id UUID,
  staff_user_id UUID,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',  -- 'open', 'acknowledged', 'resolved', 'dismissed'
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: org_member SELECT, org_admin UPDATE
-- Indexes: organization_id, status, exception_type, created_at
```

No new tables beyond these two. All metric calculations derive from existing Phase 1-4 tables.

---

## 2. Analytics Architecture

### Computation engine: `src/lib/backroom/analytics-engine.ts`

Pure functions, no side effects:

```typescript
// Core metric calculations
calculateChemicalCostPerService(sessions, bowlLines, products): number
calculateWastePercentage(wasteQty, dispensedQty): number
calculateReweighCompliance(totalBowls, reweighedBowls): number
calculateGhostLoss(theoreticalDepletion, actualStockChange): GhostLossResult
calculateInventoryDaysRemaining(onHand, dailyUsageRate): number
calculateContributionMargin(serviceRevenue, productCost, laborEstimate): ContributionMarginResult
calculateStaffEfficiency(sessions): StaffMetric[]
```

**Contribution margin formula:**
```
contribution_margin = service_revenue - product_cost - labor_estimate
margin_pct = contribution_margin / service_revenue * 100
```

**Ghost loss formula:**
```
ghost_loss = theoretical_depletion - actual_stock_decrease
// theoretical = sum of all stock_movements(reason='usage') for period
// actual = beginning_on_hand - ending_on_hand - receiving + transfers_out
// positive ghost_loss = unexplained shrinkage
```

### Aggregation hook: `useBackroomAnalytics(dateRange, locationId?)`

Fetches raw data from `mix_sessions`, `mix_bowls`, `mix_bowl_lines`, `waste_events`, `reweigh_events`, `stock_movements`, `products`, `checkout_usage_charges` and runs the analytics engine client-side for real-time views. Falls back to `backroom_analytics_snapshots` for historical ranges.

### Snapshot generation: Edge function `generate-backroom-snapshots`

Runs daily (or on-demand) to compute and upsert `backroom_analytics_snapshots` rows. Also detects exceptions and inserts into `backroom_exceptions`.

---

## 3. Dashboard Information Architecture

### 3a. Owner Dashboard — Backroom P&L

Full financial and operational visibility.

| Card | Metrics |
|---|---|
| **Chemical Cost Summary** | Avg cost/service, total cost, cost trend vs prior period |
| **Service Contribution Margin** | Revenue - product cost - labor estimate, by service category |
| **Waste Analysis** | Waste %, waste by category (donut), waste cost trend |
| **Ghost Loss Monitor** | Theoretical vs actual depletion, unexplained loss in $ |
| **Inventory Days Remaining** | Per-product projection, items < 7 days highlighted |
| **Exception Inbox** | Open exceptions count, severity breakdown |

### 3b. Manager Dashboard — Operational Control

| Card | Metrics |
|---|---|
| **Reweigh Compliance** | % of bowls reweighed, trend, non-compliant staff |
| **Usage Variance** | Sessions with over/under usage, top offenders |
| **Staff Performance** | Sessions/day, avg session time, waste per staff, variance per staff |
| **Exception Inbox** | Filterable list with acknowledge/resolve actions |
| **Overage Charges** | Pending approvals, total billed, waiver rate |

### 3c. Stylist Dashboard — Personal Performance

| Card | Metrics |
|---|---|
| **My Sessions** | Count, avg duration, completion rate |
| **My Usage Accuracy** | Variance vs baselines, trend |
| **My Waste** | Total waste %, comparison to team average |
| **My Reweigh Rate** | Compliance %, streak counter |

### Role scoping

Stylists see only their own `mixed_by_staff_id` data. Managers see location-scoped data. Owners see all locations.

---

## 4. Exception Inbox Design

### Exception types and detection rules

| Type | Trigger | Severity |
|---|---|---|
| `high_waste` | Session waste % > org threshold (default 15%) | warning/critical |
| `ghost_loss` | Daily ghost loss > $X threshold | critical |
| `missing_reweigh` | Completed session with no reweigh event | warning |
| `variance_outlier` | Usage variance > ±25% from baseline | warning |
| `no_baseline` | Service has sessions but no recipe baseline defined | info |
| `cost_spike` | Chemical cost/service > 2× rolling average | warning |
| `unresolved_session` | Session completed with `unresolved_flag = true` | warning |

### Exception lifecycle

```
open → acknowledged → resolved
open → dismissed
```

### UI: `BackroomExceptionInbox` component

- Filterable by type, severity, status, date range, staff
- Bulk acknowledge/dismiss
- Resolve with notes
- Click-through to source entity (session, product)
- Badge count on dashboard nav

---

## 5. AI Insight Layer

### Constraints (read-only)

AI may:
- Explain anomalies ("waste spiked because 3 sessions had overmix events")
- Suggest coaching ("Sarah's variance is consistently +20% on balayage")
- Summarize trends ("chemical costs down 8% this month vs last")

AI cannot:
- Modify inventory quantities
- Approve/waive billing charges
- Change service allowance policies
- Create/edit stock movements

### Implementation: Edge function `ai-backroom-insights`

Follows existing `ai-business-insights` pattern:
1. Fetch backroom data (sessions, waste, variance, exceptions) via service role
2. Build structured prompt with metrics context
3. Call Lovable AI (gemini-2.5-flash)
4. Parse structured response
5. Cache to `ai_business_insights` table with `insight_type = 'backroom'`

### Response schema

```typescript
interface BackroomAIInsight {
  category: 'waste_analysis' | 'usage_efficiency' | 'staff_coaching' |
            'cost_trend' | 'ghost_loss' | 'compliance';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  staffMentions?: string[];
  estimatedImpact?: string;
  suggestedAction?: string;
}
```

### Hook: `useBackroomAIInsights(locationId?)`

Same caching/refresh pattern as `useAIInsights` — 2hr stale time, 1min cooldown, manual refresh button.

### Integration points

- Backroom analytics page: dedicated AI insights panel
- Exception inbox: AI-generated explanation per exception (on-demand, not pre-computed)
- Staff detail cards: AI coaching suggestion (fetched via `ai-card-analysis` pattern)

---

## 6. Hooks Summary

| Hook | Purpose |
|---|---|
| `useBackroomAnalytics(dateRange, locationId?)` | Aggregate metrics from raw tables + engine |
| `useBackroomExceptions(filters?)` | CRUD for exception inbox |
| `useResolveException()` | Resolve/dismiss with notes |
| `useBackroomStaffMetrics(dateRange, staffId?)` | Per-staff session/waste/variance metrics |
| `useInventoryDaysRemaining()` | Per-product days-remaining projection |
| `useContributionMargin(dateRange, locationId?)` | Service profitability with product cost + labor |
| `useBackroomAIInsights(locationId?)` | Cached AI insights for backroom |
| `useGhostLossDetection(dateRange, locationId?)` | Theoretical vs actual depletion comparison |

---

## 7. Implementation Order

1. Create `backroom_analytics_snapshots` + `backroom_exceptions` tables via migration
2. Build `analytics-engine.ts` — pure calculation functions
3. Build `useBackroomAnalytics` + `useBackroomStaffMetrics` hooks
4. Build `useBackroomExceptions` + `useResolveException` hooks
5. Build `useContributionMargin` + `useGhostLossDetection` + `useInventoryDaysRemaining` hooks
6. Build Owner dashboard cards (Chemical Cost, Contribution Margin, Waste, Ghost Loss)
7. Build Manager dashboard cards (Compliance, Variance, Staff Performance)
8. Build Stylist dashboard cards (My Sessions, My Accuracy, My Waste)
9. Build `BackroomExceptionInbox` component
10. Build `ai-backroom-insights` edge function
11. Build `useBackroomAIInsights` hook + AI panel integration
12. Build `generate-backroom-snapshots` edge function for daily rollups

