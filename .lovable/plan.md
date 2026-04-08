

# Zura Health Engine — Architecture & Implementation Plan

## Current State Audit

### What Exists (Reusable)
- **`organization_health_scores` table** — already stores score, risk_level, score_breakdown (JSONB), trends, recommendations per org per day
- **`calculate-health-scores` edge function** — current implementation uses 4 categories (Adoption, Engagement, Performance, Data Quality) with platform-centric metrics (chat messages, login frequency) — not operator-centric business health
- **`useOrganizationHealth.ts`** hooks — fetch/display/history/recalculate hooks, typed interfaces
- **Rich existing metric hooks** — `useSalesMetrics`, `useRebookingRate`, `useCapacityUtilization`, `useClientHealthSegments`, `useRetailAttachmentRate`, `useOperationalAnalytics`, `useClientRetentionReport`, `useNewClientConversion`
- **`useOrganizationIntegrations`** — already detects POS (Phorest) and Payroll connections
- **`fetchAllBatched`** utility for 1000-row limit bypass
- **Union views** (`v_all_appointments`, `v_all_clients`, `v_all_transaction_items`) for POS-agnostic queries
- **Design token system**, `PinnableCard`, `VisibilityGate`, `BlurredAmount` — all reusable

### What Must Change
The current edge function measures **platform adoption** (logins, chat, audit logs). The new Health Engine measures **business health** (revenue, clients, retention, utilization). This is a fundamentally different scoring model — the edge function must be rewritten, not patched.

---

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│                   HEALTH ENGINE                      │
│                                                      │
│  ┌──────────────┐   ┌───────────────────────────┐   │
│  │ Data Profile  │──▶│ Category Calculators (8)   │   │
│  │ (what data    │   │ Each outputs 0-100 score   │   │
│  │  is available)│   │ + metric-level diagnostics │   │
│  └──────────────┘   └──────────┬────────────────┘   │
│                                │                     │
│                     ┌──────────▼────────────────┐   │
│                     │ Weight Normalizer          │   │
│                     │ Redistributes weights for  │   │
│                     │ unavailable categories     │   │
│                     └──────────┬────────────────┘   │
│                                │                     │
│                     ┌──────────▼────────────────┐   │
│                     │ Final Score (0-100)        │   │
│                     │ + Risk Label + Diagnostics │   │
│                     └───────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Scoring Engine (Edge Function Rewrite)

**File: `supabase/functions/calculate-health-scores/index.ts`** — Full rewrite

#### Data Completeness Profile
```ts
interface DataProfile {
  hasPOS: boolean;          // phorest_branch_id exists on any location
  hasPayroll: boolean;      // payroll_connections.status = 'connected'
  hasInventory: boolean;    // color_bar_subscriptions active OR stock_movements exist
  hasAccounting: boolean;   // future: QuickBooks/Xero connection
}
```
Built from existing `locations`, `payroll_connections`, `color_bar_subscriptions` tables.

#### 8 Category Calculators

| Category | Weight | Metrics (all deterministic) | Data Source |
|---|---|---|---|
| **Revenue Health** | 20% | Revenue growth rate (WoW), avg ticket vs benchmark, revenue per stylist | `v_all_transaction_items` |
| **Client Health** | 15% | New client acquisition rate, client-to-visit ratio, active client count trend | `v_all_clients`, `v_all_appointments` |
| **Retention Health** | 15% | Rebooking rate, client retention rate (90d), at-risk client % | `v_all_appointments`, client segments |
| **Utilization Health** | 15% | Capacity utilization %, gap hours trend, avg daily bookings | `v_all_appointments`, `location_schedules` |
| **Team Performance** | 10% | Revenue per stylist variance, KPI attainment %, staff turnover (if data) | `v_all_transaction_items`, `employee_profiles` |
| **Operational Consistency** | 10% | No-show rate, cancellation rate, late starts, data sync health | `v_all_appointments`, `phorest_sync_log` |
| **Inventory/Cost** | 5% | Waste %, reweigh compliance, stock days remaining | `backroom_analytics_snapshots` (requires `hasInventory`) |
| **Profitability** | 10% | Service margin, labor cost ratio, overhead absorption | Requires `hasAccounting` — future phase |

#### Weight Normalization
When a category is unavailable (e.g., no inventory data), its weight is redistributed proportionally:
```ts
const available = categories.filter(c => c.available);
const totalAvailableWeight = available.reduce((s, c) => s + c.baseWeight, 0);
available.forEach(c => c.effectiveWeight = c.baseWeight / totalAvailableWeight);
```

#### Location-Level Scoring
The engine calculates per-location scores first, then rolls up to org via weighted average (by location revenue share). This enables location drill-downs without additional computation.

#### Diagnostic Output
Each category returns:
```ts
{
  score: number;           // 0-100
  metrics: Array<{
    name: string;
    value: number;
    benchmark: number;
    score: number;         // 0-100 normalized
    impact: 'positive' | 'neutral' | 'negative';
  }>;
  topDrag: string;         // "Rebooking rate 23% below benchmark"
  topStrength: string;     // "New client acquisition up 15% WoW"
  leverRecommendation: string; // "Focus on checkout rebooking to recover 8 points"
}
```

### Phase 2: Database Migration

**New table: `location_health_scores`** — mirrors `organization_health_scores` but per-location
- `location_id`, `score`, `risk_level`, `score_breakdown` (JSONB), `score_date`
- RLS: org member can read their own locations

**Alter `organization_health_scores`** — expand `score_breakdown` JSONB to support 8-category structure (backward compatible, JSONB is schema-flexible)

**New table: `health_score_weights`** — system-level weight configuration
- `category`, `base_weight`, `is_active`
- Seeded with defaults, editable by platform admins only

### Phase 3: Client-Side Hooks

**New file: `src/hooks/useHealthEngine.ts`**
- `useOrgHealthScore(orgId)` — fetches latest org score with full breakdown
- `useLocationHealthScores(orgId)` — all location scores for drill-down
- `useLocationHealthScore(locationId)` — single location detail
- `useHealthHistory(orgId | locationId, days)` — trend chart data
- `useDataProfile(orgId)` — returns what integrations are active (reuses `useOrganizationIntegrations`)

### Phase 4: UI Components

**New directory: `src/components/dashboard/health-engine/`**

1. **`HealthScoreDial.tsx`** — Ring/gauge visualization (0-100), color-coded by risk tier (Elite/Strong/At Risk/Critical). Uses Recharts `PieChart` with a single arc + center label. Follows `tokens.kpi` for typography.

2. **`HealthCategoryCard.tsx`** — Expandable card per category. Collapsed: category name, score bar, trend arrow. Expanded: individual metrics with benchmark comparisons, drag/strength indicators, lever recommendation.

3. **`HealthDashboard.tsx`** — Main container. Top: `HealthScoreDial` + status label + trend. Below: grid of `HealthCategoryCard`s. Bottom: location comparison table (if multi-location).

4. **`LocationHealthDrilldown.tsx`** — Dialog/panel showing per-location scores with variance highlighting. Click a location → see its category breakdown.

5. **`DataCompletenessIndicator.tsx`** — Shows which data sources are connected, what categories are active/excluded. Non-punitive messaging: "Connect accounting to unlock Profitability scoring."

6. **`HealthMetricRow.tsx`** — Single metric row: name, current value, benchmark, mini bar, impact indicator. Used inside expanded `HealthCategoryCard`.

#### Integration Points
- **Command Center**: Add `HealthScoreDial` as a pinnable card via `PinnableCard` + `VisibilityGate`
- **Analytics Hub → Operations tab**: Full `HealthDashboard` surface
- **Platform Admin**: Org-level health comparison table (reuses existing `useOrganizationHealthScores`)

### Phase 5: Design Tokens & Rules

**Extend `src/lib/design-tokens.ts`**:
```ts
health: {
  dial: 'w-32 h-32',
  scoreLabel: 'font-display text-3xl font-medium tracking-wide',
  statusBadge: 'font-sans text-xs font-medium px-2.5 py-0.5 rounded-full',
  categoryBar: 'h-2 rounded-full',
}
```

**Risk tier colors** (added to design tokens):
- Elite (85-100): `text-emerald-500`
- Strong (70-84): `text-blue-500`
- At Risk (50-69): `text-amber-500`
- Critical (<50): `text-destructive`

---

## Scoring Formulas (Explicit)

| Metric | Formula | Benchmark | Score Mapping |
|---|---|---|---|
| Revenue Growth (WoW) | `(current_week - prev_week) / prev_week` | 0-5% | Linear: -20% = 0, +10% = 100 |
| Avg Ticket | `total_revenue / completed_appointments` | Industry $120-180 | Org's own 90d average as baseline |
| Rebooking Rate | `rebooked / completed` | 60-80% | Linear: 0% = 0, 80% = 100 |
| Utilization Rate | `booked_hours / available_hours` | 70-85% | Linear: 30% = 0, 85% = 100 |
| No-Show Rate | `no_shows / total_booked` | <5% | Inverse: 0% = 100, 15% = 0 |
| New Client Rate | `new_clients_7d / total_appointments_7d` | 10-20% | Linear |
| Client Retention (90d) | `clients_returning_within_90d / total_active` | 60-75% | Linear |
| Staff Revenue Variance | `1 - (stddev / mean)` across stylists | <0.3 | Higher uniformity = higher score |

---

## Edge Cases Handled

- **New salon (<30d data)**: Minimum data threshold per metric. Categories with insufficient data show "Collecting data" and are excluded from weighting.
- **Seasonal fluctuation**: Benchmarks use org's own rolling 90-day averages, not static industry numbers.
- **Partial integrations**: `DataProfile` dynamically excludes categories. Score always normalizes to 100.
- **Data anomalies**: Metrics with >3σ deviation from rolling average are flagged but not excluded — diagnostics surface the anomaly.

---

## Summary

| Deliverable | Files |
|---|---|
| Edge function rewrite | 1 (`calculate-health-scores/index.ts`) |
| Database migration | 1 (new `location_health_scores` table + `health_score_weights` table) |
| Client hooks | 1 (`useHealthEngine.ts`) |
| UI components | 6-7 new files in `health-engine/` |
| Design tokens | Extend existing `design-tokens.ts` |
| Total new files | ~9 |
| Modified files | ~3 (Command Center integration, Operations tab, design tokens) |

No duplication of existing hooks — the edge function calls raw SQL on union views server-side, while client hooks only fetch the pre-computed scores.

