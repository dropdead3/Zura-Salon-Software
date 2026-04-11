

# Multi-Location Growth Orchestration Engine

## What It Builds

A portfolio-level optimization layer that ranks all location-service opportunities across an organization by ROI efficiency, assigns location priority states (Attack/Maintain/Recover/Deprioritized), allocates execution capacity to highest-value opportunities first, detects winning patterns for cross-location propagation, and surfaces a simplified Global Growth Dashboard.

## Architecture

```text
Revenue Predictor (per object)
     │
     ├── Effort Unit Weights (per template)
     │
     ├── OES = Predicted Lift ÷ Effort Units
     │
     ├── Location Priority States (Attack/Maintain/Recover/Deprioritized)
     │
     ├── Capacity Allocation (role-based, global priority)
     │
     ├── Cross-Location Pattern Detection
     │
     └── Global Growth Dashboard
```

## New Files

| File | Purpose |
|---|---|
| `src/lib/seo-engine/seo-growth-orchestrator.ts` | Pure computation: OES scoring, effort units, location priority state assignment, capacity allocation, cross-location pattern detection |
| `src/hooks/useSEOGrowthOrchestration.ts` | Fetches predictions, tasks, momentum, locations; feeds orchestrator; returns ranked opportunities, location states, allocation plan |
| `src/components/dashboard/seo-workshop/SEOGlobalGrowthDashboard.tsx` | Simplified global view: Network Revenue, Top Growth Driver, Biggest Opportunity, At Risk segment |
| `src/components/dashboard/seo-workshop/SEOLocationPriorityCard.tsx` | Per-location priority state badges (Attack/Maintain/Recover/Deprioritized) with reasoning |

## Modified Files

| File | Change |
|---|---|
| `src/lib/seo-engine/seo-revenue-predictor.ts` | Add effort unit constants export |
| `src/lib/seo-engine/index.ts` | Export orchestrator functions |
| `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` | Add `SEOGlobalGrowthDashboard` card at top (above growth report) |
| `src/config/seo-engine/index.ts` | No change needed — orchestrator is lib-only |

## Core Computation Model

### Effort Unit Weights (standardized per task type)
| Template | Effort Units |
|---|---|
| `review_request` | 1 |
| `review_response` | 1 |
| `photo_upload` | 2 |
| `gbp_post` | 2 |
| `metadata_fix` | 1 |
| `internal_linking` | 2 |
| `faq_expansion` | 3 |
| `service_description_rewrite` | 3 |
| `booking_cta_optimization` | 2 |
| `before_after_publish` | 3 |
| `page_completion` | 5 |
| `local_landing_page_creation` | 8 |
| `content_refresh` | 4 |
| `service_page_update` | 3 |
| `competitor_gap_response` | 5 |
| `stylist_spotlight_publish` | 4 |

### OES Formula
```
OES = Predicted Revenue Lift (expected) ÷ Total Effort Units (pending tasks)
```
Higher OES = more revenue per unit of effort = prioritize first.

### Location Priority States
Assigned per location based on aggregate OES, momentum, and risk:

| State | Criteria | Behavior |
|---|---|---|
| **Attack** | High OES (top 25%), gaining or holding momentum | Aggressive task generation + full autonomy |
| **Maintain** | Moderate OES, stable momentum | Minimal tasks, hold position |
| **Recover** | Negative momentum, moderate+ OES | Targeted intervention, focused task assignment |
| **Deprioritized** | Low OES (bottom 25%), low opportunity | Minimal effort, shift resources to higher ROI |

### Capacity Allocation
Given org members with roles and task caps:
1. Sort all pending tasks globally by parent object OES (descending)
2. For each task, find eligible assignees (using existing assignment resolver)
3. Assign until member reaches their task cap
4. Centralized roles (marketing admin) get assigned across location boundaries based on global OES rank
5. Location-bound roles (stylists) only get tasks for their assigned location

### Cross-Location Pattern Detection
Pure pattern matching (no AI):
1. For each template key, compute average effectiveness score across locations where tasks of that type were completed
2. If a template has effectiveness > threshold at Location A but hasn't been deployed at Location B (same service category), flag as "Winning Pattern" for propagation
3. Store as a lightweight in-memory computation — no new DB table needed

## UI: Global Growth Dashboard

A compact card at the top of the SEO Engine Dashboard:

```text
┌─────────────────────────────────────────────────┐
│ NETWORK GROWTH OVERVIEW                         │
│                                                 │
│ Total Network Revenue    Top Growth Driver       │
│ $182,400 (+12%)         Mesa Blonding (+$6,200) │
│                                                 │
│ Biggest Opportunity      At Risk                │
│ Gilbert Extensions       Tempe Color            │
│ +$8,200 available        ↓ Losing momentum      │
│                                                 │
│ Focus: "Mesa Blonding — highest ROI this week"  │
└─────────────────────────────────────────────────┘
```

Below that, a `SEOLocationPriorityCard` shows each location with its priority state badge and top opportunity.

## No Database Changes
All orchestration logic is pure client-side computation over existing data (predictions, momentum, tasks, revenue). No new tables or migrations needed.

## Build Order
1. `seo-growth-orchestrator.ts` — effort units, OES, location states, allocation, patterns
2. Add effort unit exports to `seo-revenue-predictor.ts`
3. `useSEOGrowthOrchestration.ts` — hook composing predictions + momentum + tasks
4. `SEOGlobalGrowthDashboard.tsx` — network overview card
5. `SEOLocationPriorityCard.tsx` — location state display
6. Wire into `SEOEngineDashboard.tsx`
7. Update `src/lib/seo-engine/index.ts` exports

