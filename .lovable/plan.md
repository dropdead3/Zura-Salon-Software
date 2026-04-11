

# Ownership Layer (Zura Network)

## What It Builds

A network-level investment and partnership intelligence layer that identifies high-performing salons using a deterministic **Zura Ownership Score (ZOS)**, manages deal pipelines (revenue share, equity, acquisition), tracks capital deployment and returns across the network, and surfaces a centralized Network Dashboard with total revenue, top performers, expansion pipeline, and capital efficiency metrics. Sits on top of the Capital & Expansion Engine.

## Architecture

```text
Capital Engine (SPI + ROE + Expansion Opportunities)
     │
     ├── Zura Ownership Score (ZOS) per organization
     │   ├── SPI (Performance)
     │   ├── Consistency (not spikes)
     │   ├── Task Execution Reliability
     │   ├── Growth Responsiveness
     │   ├── Team Structure Stability
     │   └── Market Position
     │
     ├── Pipeline (Observe → Qualify → Offer → Convert → Scale)
     │
     ├── Deal Structures (Revenue Share / Equity / Acquisition)
     │
     ├── Capital Recycling (invest → return → reinvest)
     │
     └── Network Dashboard (platform-level)
```

## Database Changes

**New table: `network_ownership_scores`**
- `id`, `organization_id` (FK organizations), `zos_score` (0–100)
- `spi_component` (0–100), `consistency_component` (0–100), `execution_reliability` (0–100), `growth_responsiveness` (0–100), `team_stability` (0–100), `market_position` (0–100)
- `eligibility_status` (enum: `prime`, `watchlist`, `ineligible`)
- `hard_filter_results` (jsonb — min revenue, review volume, momentum, stability checks)
- `factors` (jsonb), `scored_at`, `created_at`
- RLS: platform admin read only (uses `is_platform_user`)

**New table: `network_deals`**
- `id`, `organization_id`, `deal_type` (enum: `revenue_share`, `equity_stake`, `full_acquisition`)
- `pipeline_stage` (enum: `observe`, `qualify`, `offer`, `convert`, `scale`)
- `terms` (jsonb — percentage, capital amount, vesting, etc.)
- `capital_deployed` (numeric), `total_return` (numeric), `roi_multiple` (numeric)
- `start_date`, `status` (active/paused/exited), `notes` (text)
- `created_at`, `updated_at`
- RLS: platform admin read/write

**New table: `network_capital_ledger`**
- `id`, `deal_id` (FK network_deals), `organization_id`
- `entry_type` (enum: `investment`, `return`, `reinvestment`)
- `amount` (numeric), `description` (text), `recorded_at`, `created_at`
- RLS: platform admin read/write

## New Files

| File | Purpose |
|---|---|
| `src/config/capital-engine/ownership-config.ts` | ZOS weights, eligibility thresholds, hard filter minimums, deal type labels, pipeline stage labels |
| `src/lib/capital-engine/ownership-engine.ts` | Pure computation: ZOS scoring (weighted components), eligibility determination with hard filters, capital recycling metrics (total deployed, total returned, net multiple), network summary aggregation |
| `src/hooks/useNetworkOwnership.ts` | Queries `network_ownership_scores`, `network_deals`, `network_capital_ledger`; composes network summary metrics |
| `src/components/dashboard/capital-engine/NetworkDashboard.tsx` | Platform-level view: total network revenue, top performers, expansion pipeline count, capital efficiency (deployed vs returned) |
| `src/components/dashboard/capital-engine/ZOSCard.tsx` | Individual org ZOS display with component breakdown and eligibility badge |
| `src/components/dashboard/capital-engine/DealPipelineCard.tsx` | Pipeline visualization: observe → qualify → offer → convert → scale with deal counts per stage |
| `src/components/dashboard/capital-engine/CapitalRecyclingCard.tsx` | Capital deployed vs returned, ROI multiple, reinvestment flow |
| `supabase/functions/calculate-zos/index.ts` | Edge function: computes ZOS per org by aggregating SPI scores, revenue consistency (stddev over 90 days), task completion rates, growth response metrics, team concentration, and domination scores |

## Modified Files

| File | Change |
|---|---|
| `src/lib/capital-engine/index.ts` | Export ownership engine functions |
| `src/config/capital-engine/index.ts` | Export ownership config |

## Core Computation Model

### ZOS (0–100)

| Component | Weight | Source |
|---|---|---|
| SPI (Performance) | 30% | Average SPI across org locations from `salon_performance_index` |
| Consistency | 20% | Inverse of revenue coefficient of variation over 90 days |
| Task Execution Reliability | 15% | SEO task completion rate + on-time rate |
| Growth Responsiveness | 15% | Revenue delta after recommended actions (did they follow the system?) |
| Team Stability | 10% | Inverse of stylist concentration + low cancellation rate |
| Market Position | 10% | Average domination score across active targets |

### Eligibility

| Status | Criteria |
|---|---|
| **Prime** | ZOS ≥ 85, all hard filters pass |
| **Watchlist** | ZOS 70–84, all hard filters pass |
| **Ineligible** | ZOS < 70 OR any hard filter fails |

### Hard Filters (all must pass)
- Minimum monthly revenue ≥ configurable threshold (default $30K)
- Minimum review count ≥ 50
- Positive momentum trend (not declining over 60 days)
- No operational instability flags (Health Engine critical tier)

### Capital Recycling Metrics
- Total Deployed: sum of `investment` entries in ledger
- Total Returned: sum of `return` entries
- Net ROI Multiple: Total Returned / Total Deployed
- Recycled Capital: sum of `reinvestment` entries

### Pipeline Summary
Count of deals per stage, with aggregate capital at each stage.

## UI: Network Dashboard

```text
┌─────────────────────────────────────────────────┐
│ ZURA NETWORK                                    │
│                                                 │
│ Total Network Revenue    Capital Deployed        │
│ $3.2M (+18%)             $420K → $1.1M (2.6x)  │
│                                                 │
│ Pipeline                                        │
│ Observe: 12 · Qualify: 5 · Offer: 2 · Active: 3│
│                                                 │
│ Top Performers                                  │
│ ┌──────────────────────────────────────────────┐│
│ │ Mesa Extensions   ZOS: 92  Prime   SPI: 88  ││
│ │ Gilbert Central   ZOS: 78  Watch   SPI: 72  ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│ Capital Recycling                               │
│ Deployed: $420K · Returned: $1.1M · 2.6x ROI   │
│ Reinvested: $380K                               │
└─────────────────────────────────────────────────┘
```

## Access Control

This is a **platform-level** feature — only accessible to platform admins (Super Admin / God Mode). All tables use `is_platform_user(auth.uid())` for RLS. The Network Dashboard is rendered inside the Platform Admin suite, not the tenant dashboard.

## Edge Function: `calculate-zos`

Runs on-demand or weekly. Service-role access.

1. For each active organization, query latest SPI scores and average across locations
2. Compute revenue consistency from `phorest_appointments` (90-day stddev / mean)
3. Query `seo_tasks` completion rates for execution reliability
4. Compute growth responsiveness: revenue delta in periods after task completion bursts
5. Query stylist revenue concentration for team stability
6. Query `seo_domination_scores` for market position average
7. Apply weights → ZOS score
8. Run hard filters → eligibility status
9. Upsert into `network_ownership_scores`

## Build Order

1. DB migration (3 new tables + enums + RLS with `is_platform_user`)
2. `ownership-config.ts` (ZOS weights, thresholds, deal/pipeline labels)
3. `ownership-engine.ts` (ZOS computation, eligibility, capital recycling math)
4. `calculate-zos` edge function
5. `useNetworkOwnership.ts` hook
6. UI: `ZOSCard`, `DealPipelineCard`, `CapitalRecyclingCard`, `NetworkDashboard`
7. Wire into Platform Admin navigation
8. Export updates

## Technical Notes

- ZOS is deterministic — AI used only for generating partnership recommendation summaries
- All network-level data is visible only to platform admins; organizations never see their ZOS or other orgs' data
- Capital ledger is append-only for auditability
- Hard filters are AND-gated — a single failure blocks eligibility regardless of ZOS score
- The system recommends but never auto-executes deals — all partnership decisions require human approval

