

# Capital and Expansion Engine

## What It Builds

A capital allocation intelligence layer that computes a **Salon Performance Index (SPI)** per location, combines it with market opportunity and predicted revenue lift to produce **Return on Expansion (ROE)** scores, and ranks all investment opportunities in a global capital priority queue. Supports expansion scenario simulation with projected lift, break-even timeline, and confidence bands.

## Architecture

```text
Location Health Engine (existing)
     │
     ├── SPI (0–100) per location
     │   ├── Revenue Efficiency (25%)
     │   ├── Growth Velocity (20%)
     │   ├── Conversion Strength (15%)
     │   ├── Pricing Power (15%)
     │   ├── Operational Stability (15%)
     │   └── Execution Quality (10%)
     │
     ├── Expansion Opportunities
     │   ├── Existing Location Expansion
     │   ├── New Location Launch
     │   ├── Category Expansion
     │   └── Acquisition Targets (future)
     │
     ├── ROE = Predicted Revenue Lift ÷ Capital Required
     │
     ├── Capital Priority Queue (ranked by ROE)
     │
     ├── Investment Scenario Simulator
     │
     └── Risk Model (volatility, stylist dependency, competition)
```

## Database Changes

**New table: `expansion_opportunities`**
- `id`, `organization_id`, `location_id` (nullable — null for new location proposals)
- `opportunity_type` (enum: `location_expansion`, `new_location`, `category_expansion`, `acquisition`)
- `title`, `description`, `city`, `service_category`
- `capital_required` (numeric), `predicted_annual_lift` (numeric), `roe_score` (numeric)
- `break_even_months` (numeric), `confidence` (low/medium/high)
- `risk_factors` (jsonb), `spi_at_creation` (numeric)
- `status` (enum: `identified`, `evaluating`, `approved`, `in_progress`, `completed`, `dismissed`)
- `is_active` (boolean, default true), `created_at`, `updated_at`
- RLS: org member read, org admin write

**New table: `expansion_scenarios`**
- `id`, `organization_id`, `opportunity_id` (FK)
- `investment_amount` (numeric), `projected_monthly_lift` (numeric), `break_even_months` (numeric)
- `confidence`, `assumptions` (jsonb), `result_summary` (jsonb)
- `created_at`, `created_by`
- RLS: org member read, org admin write

**New table: `salon_performance_index`**
- `id`, `organization_id`, `location_id`
- `spi_score` (0–100), `revenue_efficiency` (0–100), `growth_velocity` (0–100), `conversion_strength` (0–100), `pricing_power` (0–100), `operational_stability` (0–100), `execution_quality` (0–100)
- `risk_level` (text), `factors` (jsonb), `scored_at`, `created_at`
- RLS: org member read

## New Files

| File | Purpose |
|---|---|
| `src/lib/capital-engine/capital-engine.ts` | Pure computation: SPI scoring (weighted components from Health Engine data + SEO momentum + task completion), ROE calculation, risk modeling, capital queue ranking, break-even estimation |
| `src/config/capital-engine/capital-config.ts` | SPI weights, ROE thresholds, risk factor definitions, expansion type labels |
| `src/hooks/useCapitalEngine.ts` | Composes Health Engine scores + momentum + domination data + revenue; feeds capital engine; returns SPI per location, ranked opportunities, scenario results |
| `src/hooks/useExpansionOpportunities.ts` | CRUD queries for `expansion_opportunities` and `expansion_scenarios` |
| `src/components/dashboard/capital-engine/CapitalDashboard.tsx` | Top expansion opportunity, capital priority queue, SPI summary per location |
| `src/components/dashboard/capital-engine/SPICard.tsx` | Location SPI score display with component breakdown |
| `src/components/dashboard/capital-engine/ExpansionSimulator.tsx` | Investment scenario form: input capital amount → see projected lift, break-even, confidence |
| `src/components/dashboard/capital-engine/CapitalPriorityQueue.tsx` | Ranked list of all opportunities by ROE |
| `supabase/functions/calculate-spi/index.ts` | Edge function: computes SPI scores per location using Health Engine data, SEO momentum, and task completion rates |

## Modified Files

| File | Change |
|---|---|
| `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` | Add link/card to Capital Dashboard from growth orchestration section |
| `src/lib/seo-engine/index.ts` | No changes needed — capital engine is separate module |

## Core Computation Model

### SPI (0–100)

| Component | Weight | Source |
|---|---|---|
| Revenue Efficiency | 25% | Health Engine `revenue` category (rev/chair, rev/hour, utilization) |
| Growth Velocity | 20% | SEO momentum score + booking growth rate from Health Engine trends |
| Conversion Strength | 15% | Health Engine `client` category + SEO conversion health |
| Pricing Power | 15% | Avg ticket vs industry benchmark (from Industry Intelligence) + Health Engine revenue metrics |
| Operational Stability | 15% | Health Engine `retention` + `operational_consistency` categories |
| Execution Quality | 10% | SEO task completion rate + campaign success rate |

SPI reuses existing Health Engine scores (already computed per location) and supplements with SEO engine data. No duplicate computation.

### ROE Formula
```
ROE = Predicted Annual Revenue Lift ÷ Capital Required
```

### Break-Even Estimation
```
Break-Even Months = Capital Required ÷ Predicted Monthly Lift
```
Adjusted by confidence factor (high: 1.0x, medium: 1.3x, low: 1.6x).

### Risk Model (jsonb factors)
Each opportunity gets risk scores for:
- `volatility`: Revenue variance coefficient over 90 days
- `stylist_dependency`: Revenue concentration in top stylists
- `competition_intensity`: From domination engine competitor data
- `market_saturation`: From industry intelligence demand signals

### Capital Priority Queue
Sort all opportunities by ROE descending. Display top recommendation as a directive.

### Investment Scenario Simulator
User inputs: capital amount + opportunity type. Engine returns:
- Projected monthly and annual lift (low/expected/high bands)
- Break-even timeline
- Confidence level with reasoning
- Risk summary

All deterministic — uses existing coefficients from revenue predictor and health engine.

## UI: Capital Dashboard

```text
┌─────────────────────────────────────────────────┐
│ CAPITAL & EXPANSION                             │
│                                                 │
│ Top Opportunity                                 │
│ Scottsdale Extensions — ROE: 2.5x              │
│ Investment: $80K · Return: $200K · 6mo payback  │
│ Confidence: High                                │
│                                                 │
│ Location Performance Index                      │
│ ┌────────────┬──────┬───────────────────┐       │
│ │ Mesa       │ SPI 82│ High Performer   │       │
│ │ Gilbert    │ SPI 61│ Growth Opportunity│       │
│ │ Scottsdale │ SPI 74│ Strong           │       │
│ └────────────┴──────┴───────────────────┘       │
│                                                 │
│ Capital Priority Queue                          │
│ 1. Scottsdale Expansion (2.5x ROE)             │
│ 2. Mesa Optimization (2.1x ROE)                │
│ 3. Gilbert Upgrade (1.5x ROE)                  │
│                                                 │
│ [Simulate Investment]                           │
│ "Focus capital on Scottsdale before Gilbert"    │
└─────────────────────────────────────────────────┘
```

## Build Order

1. DB migration (3 new tables + enums + RLS)
2. `capital-config.ts` (SPI weights, ROE thresholds, risk definitions)
3. `capital-engine.ts` (SPI computation, ROE, risk model, queue ranking, break-even)
4. `calculate-spi` edge function
5. `useExpansionOpportunities.ts` hook (CRUD)
6. `useCapitalEngine.ts` hook (compose Health + SEO + capital data)
7. UI components: `SPICard`, `CapitalPriorityQueue`, `ExpansionSimulator`, `CapitalDashboard`
8. Wire into navigation / SEO Engine Dashboard

## Technical Notes

- SPI deliberately reuses Health Engine location scores — the 8 health categories map cleanly to SPI's 6 components
- ROE and scenario modeling are pure deterministic computation — AI used only for generating recommendation copy
- Risk model is additive to ROE, not a replacement — high-risk opportunities can still rank #1 if ROE is high enough, but risk is surfaced clearly
- All data is org-scoped; no cross-org investment data exposure
- The `gate_margin_baselines` enforcement gate already exists — Capital Dashboard requires it before showing expansion recommendations

