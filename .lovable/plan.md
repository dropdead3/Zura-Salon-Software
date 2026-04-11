

# Industry Intelligence Layer

## What It Builds

A cross-network aggregation and trend detection layer that computes anonymized, privacy-safe industry signals from all organizations on the platform. Detects demand shifts, keyword trends, pricing signals, and task effectiveness patterns. Surfaces benchmarking, a "What's Working Now" feed, and predictive trend signals — all feeding into the existing Momentum, Revenue Predictor, and Task Engines to dynamically adjust strategy.

## Architecture

```text
All Orgs (anonymized, aggregated)
     │
     ├── Edge Function: seo-industry-aggregator
     │   ├── Demand Trends (booking velocity by service category × city)
     │   ├── Keyword Trends (review keyword frequency shifts)
     │   ├── Price Signals (avg ticket changes by category × market)
     │   ├── Task Effectiveness (which actions produce results network-wide)
     │   └── Conversion Patterns (content type → booking correlation)
     │
     ├── industry_trend_signals (platform-scoped, no org identity)
     │
     ├── industry_benchmarks (percentile bands, updated weekly)
     │
     └── UI: IndustryIntelligenceFeed + Benchmarking Card
```

## Privacy Model (Critical)

- The aggregation edge function runs with service-role access
- All outputs are **platform-scoped** (`organization_id IS NULL`) — no org identity stored in trend tables
- Minimum cohort size enforced: signals require data from ≥5 organizations to be published
- No raw data leaves org scope — only pre-aggregated counts, averages, and deltas
- Trend rows contain only: category, city, metric_type, value, delta, cohort_size, period

## Database Changes

**New table: `industry_trend_signals`**
- `id`, `signal_type` (demand_shift | keyword_trend | price_signal | effectiveness_pattern | conversion_pattern)
- `category` (service category), `city` (geographic market), `metric_key`, `current_value`, `previous_value`, `delta_pct`, `direction` (rising | stable | declining)
- `cohort_size` (number of orgs contributing), `confidence` (low | medium | high)
- `period_start`, `period_end`, `computed_at`, `expires_at`
- `insight_text` (AI-generated human-readable summary)
- **No `organization_id` column** — this is platform-level data
- RLS: readable by any authenticated user (public industry data)

**New table: `industry_benchmarks`**
- `id`, `category`, `city`, `metric_key`
- `p25`, `p50`, `p75`, `p90` (percentile values)
- `cohort_size`, `computed_at`, `period`
- **No `organization_id`** — platform-level
- RLS: readable by authenticated users

**Extend `metric_benchmarks`**: Add rows with `benchmark_type = 'network_p50'` and `'network_p90'` per org (org-scoped comparison against industry percentiles), computed by the aggregator

## New Files

| File | Purpose |
|---|---|
| `src/config/seo-engine/seo-industry-config.ts` | Signal types, confidence thresholds, minimum cohort sizes, trend detection parameters |
| `src/lib/seo-engine/seo-industry-intelligence.ts` | Pure computation: trend detection (compare rolling windows), percentile benchmarking, demand shift classification, pattern matching for "what's working" |
| `supabase/functions/seo-industry-aggregator/index.ts` | Weekly edge function: queries anonymized aggregates across all orgs, computes trends + benchmarks, upserts into platform tables, generates insight text via AI |
| `src/hooks/useSEOIndustryIntelligence.ts` | Queries `industry_trend_signals` + `industry_benchmarks`, composes with org data for relative positioning |
| `src/components/dashboard/seo-workshop/SEOIndustryFeed.tsx` | "What's Working Now" feed card + demand shift alerts + benchmark comparison |

## Modified Files

| File | Change |
|---|---|
| `src/components/dashboard/seo-workshop/SEOEngineDashboard.tsx` | Add `SEOIndustryFeed` card below Domination Dashboard |
| `src/lib/seo-engine/index.ts` | Export industry intelligence functions |
| `src/config/seo-engine/index.ts` | Export industry config |

## Core Computation Model

### Trend Detection
Compare 4-week rolling windows (current vs previous):
- **Demand shift**: booking count delta by service category × city. ≥15% = "rising", ≤-15% = "declining"
- **Keyword trends**: review keyword frequency shift. New keywords appearing in ≥10% of reviews = "emerging"
- **Price signals**: avg ticket delta by category. ≥10% increase without booking decline = "elastic"
- **Task effectiveness**: network-wide completion rate × impact score by template key. Feeds back into `computeEffectivenessModifiers`
- **Conversion patterns**: content type (FAQ, before/after, video) → booking correlation

### Confidence Assignment
- High: cohort ≥20 orgs, consistent direction across 3+ weeks
- Medium: cohort 10–19 orgs, consistent 2+ weeks
- Low: cohort 5–9 orgs or single-week signal

### Benchmarking
For each org, compute percentile rank against network for:
- Review velocity, content volume, avg ticket, conversion rate, page health scores
- Display: "Your review velocity: 62nd percentile (above 62% of similar salons)"

### "What's Working Now" Feed
Top 5 actionable signals sorted by confidence × relevance to org's active targets:
- "Review-driven growth outperforming content-heavy strategies this month"
- "FAQ-heavy pages improving conversion by ~9% across the network"
- "High-ticket extension services converting best with before/after proof"

### Integration with Existing Engines
- **Effectiveness Tracker**: Network-wide effectiveness data supplements org-level data when org sample size < 5 (cold-start problem)
- **Revenue Predictor**: Network coefficients used as fallback baseline when org has insufficient history
- **Domination Engine**: Market demand estimates enriched with network booking velocity data

## Edge Function: `seo-industry-aggregator`

Runs weekly (via pg_cron). Service-role access only.

1. Query all `phorest_appointments` grouped by service category + location city → aggregate booking counts per 4-week window (no org identity in output)
2. Query all `seo_health_scores` → compute percentile bands per domain per category
3. Query all `seo_tasks` completed → aggregate effectiveness by template key (no org identity)
4. Query review text from `seo_health_scores.raw_signals` → extract keyword frequency shifts
5. Enforce minimum cohort (≥5 orgs per signal)
6. Upsert into `industry_trend_signals` + `industry_benchmarks`
7. For top signals, call AI to generate one-line human-readable `insight_text`
8. Compute per-org percentile positions → upsert into `metric_benchmarks` with `benchmark_type = 'network_p50'`

## UI: Industry Intelligence Feed

```text
┌─────────────────────────────────────────────────┐
│ INDUSTRY INTELLIGENCE                           │
│                                                 │
│ What's Working Now                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ ↑ Review campaigns producing +22% booking   │ │
│ │   lift across network (high confidence)      │ │
│ ├─────────────────────────────────────────────┤ │
│ │ ↑ FAQ-heavy pages +9% conversion vs plain   │ │
│ │   service pages (medium confidence)          │ │
│ ├─────────────────────────────────────────────┤ │
│ │ → GBP posting showing diminishing returns   │ │
│ │   after 3x/week (medium confidence)         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Your Position                                   │
│ Review Velocity:  72nd percentile  ↑            │
│ Content Volume:   45th percentile  →            │
│ Avg Ticket:       81st percentile  ↑            │
│                                                 │
│ Market Alert                                    │
│ "Extensions demand rising +18% in Phoenix —     │
│  competition hasn't adjusted yet"               │
└─────────────────────────────────────────────────┘
```

## Build Order

1. DB migration (new tables, RLS)
2. `seo-industry-config.ts` (signal types, thresholds, cohort minimums)
3. `seo-industry-intelligence.ts` (pure trend detection + benchmarking logic)
4. `seo-industry-aggregator` edge function
5. `useSEOIndustryIntelligence.ts` hook
6. `SEOIndustryFeed.tsx` card
7. Wire into `SEOEngineDashboard.tsx`
8. Export updates
9. Schedule weekly cron job for aggregator

## Technical Notes

- All trend computation is deterministic — AI generates explanation text only, never determines signal existence or confidence
- Privacy enforced at the aggregation layer: the edge function outputs only aggregate values; no org-level data enters the trend tables
- Minimum cohort of 5 prevents de-anonymization in small markets
- Network effectiveness data supplements org-level cold starts but never overrides org-specific data when sufficient samples exist
- Signals expire automatically (`expires_at`) to prevent stale intelligence

