

# Market Domination Mode

## What It Builds

A category-level competitive intelligence layer that defines "Domination Targets" (city + service category + optional micro-market keywords), computes a 0–100 Domination Score per target, estimates visible market share, assigns strategy states (Attack/Expand/Defend/Abandon), generates multi-location Domination Campaigns, and provides a city-level momentum view. Sits on top of the Growth Orchestration Engine.

## Architecture

```text
Domination Targets (city + service + keyword)
     │
     ├── Domination Score (0–100)
     │   ├── Review Dominance (30%)
     │   ├── Content Volume (20%)
     │   ├── Page Strength (20%)
     │   ├── Conversion Strength (15%)
     │   └── Competitor Suppression (15%)
     │
     ├── Market Share Estimate
     │   ├── Visible Share (review %, content %, ranking)
     │   └── Revenue Share (bookings vs estimated demand)
     │
     ├── Strategy State (Attack/Expand/Defend/Abandon)
     │
     ├── Domination Campaigns (cross-location coordination)
     │
     └── City-Level Momentum
```

## Database Changes

**New table: `seo_domination_targets`**
- `id`, `organization_id`, `city`, `service_category`, `micro_market_keywords` (text[])
- `is_active` (boolean, default true)
- `created_at`, `updated_at`
- RLS: org member read, org admin write

**New table: `seo_domination_scores`**
- `id`, `organization_id`, `target_id` (FK to domination_targets)
- `domination_score` (0–100), `review_dominance` (0–100), `content_dominance` (0–100), `page_strength` (0–100), `conversion_strength` (0–100), `competitor_suppression` (0–100)
- `visible_market_share` (numeric 0–1), `captured_revenue_share` (numeric 0–1)
- `strategy_state` (enum: attack, expand, defend, abandon)
- `contributing_location_ids` (text[]), `estimated_market_demand` (numeric)
- `factors` (jsonb — breakdown detail), `scored_at`, `created_at`
- RLS: org member read, org admin write

## New Files

| File | Purpose |
|---|---|
| `src/lib/seo-engine/seo-domination-engine.ts` | Pure computation: Domination Score calculation (weighted components), strategy state assignment, market share estimation, city-level momentum aggregation, domination campaign generation |
| `src/config/seo-engine/seo-domination-config.ts` | Score weight config, strategy state thresholds and labels, category stacking priority logic |
| `src/hooks/useSEODomination.ts` | Queries domination targets + scores, composes with orchestration data |
| `src/components/dashboard/seo-workshop/SEODominationDashboard.tsx` | Market overview card: targets with scores, strategy badges, market share bars, city momentum |
| `src/components/dashboard/seo-workshop/SEODominationTargetCard.tsx` | Individual target detail: score breakdown radar, contributing locations, top actions |
| `supabase/functions/seo-domination-score/index.ts` | Edge function: computes domination scores by aggregating health scores, revenue, review counts, and competitor data across locations for each target |

## Modified Files

| File | Change |
|---|---|
| `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` | Add `SEODominationDashboard` above Global Growth Orchestration |
| `src/lib/seo-engine/index.ts` | Export domination engine functions |
| `src/config/seo-engine/index.ts` | Export domination config |

## Core Computation Model

### Domination Score (0–100)

| Component | Weight | Source |
|---|---|---|
| Review Dominance | 30% | Aggregate review count + velocity across org locations vs competitors in same city-service |
| Content Volume | 20% | Page count, word count, FAQ coverage, before/after content for this service-city |
| Page Strength | 20% | Average `page` health score across contributing SEO objects |
| Conversion Strength | 15% | Average `conversion` health score across contributing SEO objects |
| Competitor Suppression | 15% | Inverse of competitor gap scores (high gap = low suppression) |

### Strategy State Assignment

| State | Criteria | Icon/Color |
|---|---|---|
| **Defend** | Score ≥ 80, momentum gaining or holding | Shield / blue |
| **Expand** | Score 60–79, momentum gaining | TrendingUp / green |
| **Attack** | Score 40–79, momentum not losing, estimated demand high | Zap / amber |
| **Abandon** | Score < 40 AND estimated demand low relative to other targets | Pause / muted |

### Market Share Estimation

- **Visible share**: `org_review_count / (org_review_count + competitor_review_count)` for this city-service. Supplemented by content volume ratio.
- **Revenue share**: `org_attributed_revenue / estimated_market_demand`. Market demand estimated from: review volume × avg ticket × conversion factor (configurable).

### City-Level Momentum

Aggregates momentum scores from all SEO objects in a city, weighted by revenue contribution. Output: per-city directional signal.

### Domination Campaigns

When a target is in Attack or Expand state with sufficient opportunity, the engine generates a cross-location campaign bundle:
- Identifies which locations contribute to this target
- Distributes tasks based on each location's weakness (one gets reviews, another gets content)
- Sets a 60–90 day window with milestone checkpoints
- Links to existing `seo_campaigns` table for execution

### Category Stacking

After a target reaches Defend state (score ≥ 80), the system identifies the next highest-opportunity target in the same city and recommends shifting resources. Surfaced as a "Next Target" directive.

## UI: Domination Dashboard

```text
┌─────────────────────────────────────────────────┐
│ MARKET DOMINATION                               │
│                                                 │
│ Phoenix                                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ Hair Extensions        Score: 62  ATTACK    │ │
│ │ Market Share: ~18%  ·  +$42,000 opportunity │ │
│ │ Mesa + Gilbert contributing                 │ │
│ │ "2–3 weeks from controlling this category"  │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Blonding               Score: 38  EXPAND    │ │
│ │ Market Share: ~8%   ·  +$28,000 opportunity │ │
│ │ "Build after Extensions is won"             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Scottsdale                                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ Extensions             Score: 45  ATTACK    │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Edge Function: `seo-domination-score`

Triggered by daily scan or on-demand. For each active domination target:
1. Find all `seo_objects` matching the target's service category + city (via location addresses)
2. Aggregate health scores across contributing objects (review, page, content, conversion, competitive_gap domains)
3. Sum review counts and content metrics from `seo_health_scores.raw_signals`
4. Compute competitor totals from `competitor` type SEO objects
5. Calculate domination score components + market share estimates
6. Assign strategy state
7. Upsert into `seo_domination_scores`

## Build Order

1. DB migration (new tables + enum)
2. `seo-domination-config.ts` (weights, thresholds, strategy labels)
3. `seo-domination-engine.ts` (pure scoring + strategy + campaign generation)
4. `seo-domination-score` edge function
5. `useSEODomination.ts` hook
6. `SEODominationDashboard.tsx` + `SEODominationTargetCard.tsx`
7. Wire into `SEOEngineDashboard.tsx`
8. Export updates

## Technical Notes

- All scoring is deterministic — AI used only for generating campaign copy and directive explanations
- Domination targets are manually defined by org admins (or auto-suggested from existing `location_service` SEO objects)
- Integrates with existing Growth Orchestration: domination strategy influences OES weighting
- No cross-organization data exposure — competitor data is org-scoped estimates

