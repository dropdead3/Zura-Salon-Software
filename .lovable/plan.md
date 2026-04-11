

# Stylist-Level Financing and Ownership Path System

## What It Builds

An individual stylist performance scoring and career progression engine that extends the existing level system with a **Stylist Performance Index (SPI)** and **Ownership Readiness Score (ORS)**. Stylists who meet deterministic thresholds unlock micro-financing opportunities (chair expansion, inventory, marketing, mini-location launches) presented as growth actions — never as loan applications. Career stages (Stylist → High Performer → Lead → Operator → Owner) are tracked and surfaced with milestone-based unlocks.

## Architecture

```text
Stylist Performance Data (appointments, revenue, retention, tasks)
     │
     ├── Stylist SPI Engine (individual-level, 0-100)
     │   ├── Revenue/mo (25%)
     │   ├── Retention Rate (20%)
     │   ├── Rebooking Rate (15%)
     │   ├── Execution Discipline (15%)
     │   ├── Growth Trend (15%)
     │   └── Review Quality (10%)
     │
     ├── ORS Engine (stricter, 0-100)
     │   ├── SPI Average (40%)
     │   ├── Consistency over time (25%)
     │   ├── Leadership signals (20%)
     │   └── Demand stability (15%)
     │
     ├── Career Stage Assignment (deterministic)
     │   ├── Stage 1: Stylist (default)
     │   ├── Stage 2: High Performer (SPI ≥ 70)
     │   ├── Stage 3: Lead (SPI ≥ 80 + leadership criteria)
     │   ├── Stage 4: Operator (ORS ≥ 70)
     │   └── Stage 5: Owner (ORS ≥ 85 + hard filters)
     │
     ├── Micro-Financing Eligibility (gated)
     │   ├── SPI threshold per use case
     │   ├── ORS threshold for expansion-level financing
     │   └── Demand + confidence checks
     │
     └── Ownership Track Dashboard (stylist-facing)
```

## How It Connects to Existing Infrastructure

- **Reuses** `useLevelProgress` composite score data as inputs to Stylist SPI (revenue, retention, rebooking, utilization are already computed)
- **Reuses** existing `financing-engine.ts` eligibility checks and `FundThisDialog` Stripe flow for micro-financing execution
- **Reuses** `financed_projects` + `financed_project_ledger` tables for tracking funded projects
- **Extends** `expansion_opportunities` to support stylist-scoped opportunities (adds `staff_user_id` column)

## Database Changes

**New table: `stylist_spi_scores`**
- `id`, `organization_id`, `user_id` (FK employee), `location_id` (nullable)
- `spi_score` (numeric 0-100), `revenue_score`, `retention_score`, `rebooking_score`, `execution_score`, `growth_score`, `review_score` (all numeric 0-100)
- `tier` (text: elite/high/growth/underperforming)
- `scored_at` (timestamptz), `period_start` (date), `period_end` (date)
- RLS: org member read, service-role write

**New table: `stylist_ors_scores`**
- `id`, `organization_id`, `user_id`
- `ors_score` (numeric 0-100), `spi_average` (numeric), `consistency_score` (numeric), `leadership_score` (numeric), `demand_stability` (numeric)
- `career_stage` (text: stylist/high_performer/lead/operator/owner)
- `financing_eligible` (boolean), `ownership_eligible` (boolean)
- `scored_at` (timestamptz)
- RLS: org member read (own record), org admin read all

**New table: `stylist_career_milestones`**
- `id`, `organization_id`, `user_id`
- `milestone_type` (text: stage_promotion/financing_unlock/ownership_eligible)
- `from_stage` (text, nullable), `to_stage` (text)
- `spi_at_milestone` (numeric), `ors_at_milestone` (numeric, nullable)
- `achieved_at` (timestamptz)
- RLS: org member read own, org admin read all

**Alter table: `expansion_opportunities`**
- Add `staff_user_id` (uuid, nullable, FK employee_profiles.user_id) — enables stylist-scoped micro-financing opportunities

**Alter table: `financed_projects`**
- Add `staff_user_id` (uuid, nullable) — tracks which stylist a financed project belongs to
- Add `repayment_model` (text, default 'fixed', enum: fixed/revenue_based/hybrid)
- Add `revenue_share_pct` (numeric, nullable) — for revenue-based repayment

## New Files

| File | Purpose |
|---|---|
| `src/config/capital-engine/stylist-financing-config.ts` | Career stage definitions, SPI weights, ORS weights, micro-financing thresholds per use case, repayment model defaults |
| `src/lib/capital-engine/stylist-spi-engine.ts` | Pure computation: `computeStylistSPI()` from revenue/retention/rebooking/execution/growth/review inputs; `computeORS()` from SPI history + leadership + consistency; `determineCareerStage()` |
| `src/hooks/useStylistSPI.ts` | Queries `stylist_spi_scores` + `stylist_ors_scores` for a given user; composes career stage data |
| `src/hooks/useStylistFinancingEligibility.ts` | Evaluates micro-financing eligibility for a stylist using SPI/ORS thresholds + existing `isFinancingEligible()` |
| `src/components/dashboard/career/OwnershipTrackCard.tsx` | Stylist-facing card: current career stage, SPI gauge, next milestone, progress indicators |
| `src/components/dashboard/career/StylistSPICard.tsx` | Individual SPI breakdown with component scores and tier badge |
| `src/components/dashboard/career/MicroFinancingOpportunities.tsx` | Lists eligible micro-financing opportunities with "Activate Growth" action (reuses FundThisDialog) |
| `src/components/dashboard/career/CareerMilestoneTimeline.tsx` | Timeline of achieved milestones |
| `supabase/functions/compute-stylist-spi/index.ts` | Edge function: aggregates appointment/revenue/retention data per stylist, computes SPI + ORS, upserts scores, detects stage transitions, records milestones |

## Modified Files

| File | Change |
|---|---|
| `src/lib/capital-engine/financing-engine.ts` | Add `isStylistFinancingEligible()` that checks SPI + ORS thresholds in addition to existing ROE/confidence/risk checks |
| `src/lib/capital-engine/index.ts` | Export new stylist SPI/ORS functions |
| `src/config/capital-engine/index.ts` | Export stylist financing config |
| `src/config/capital-engine/financing-config.ts` | Add `STYLIST_FINANCING_THRESHOLDS` for micro-financing use cases and `REPAYMENT_MODELS` config |
| Stylist dashboard page (existing) | Add `OwnershipTrackCard` to stylist-facing dashboard |
| `src/components/dashboard/capital-engine/CapitalDashboard.tsx` | Add admin view of stylist-level financing pipeline |

## Core Computation Model

### Stylist SPI (0-100)
```
SPI = Revenue(25%) + Retention(20%) + Rebooking(15%) + Execution(15%) + Growth(15%) + Review(10%)
```
Inputs derived from existing `useLevelProgress` data + appointment analytics.

### ORS (0-100)
```
ORS = SPIAverage_6mo(40%) + Consistency(25%) + Leadership(20%) + DemandStability(15%)
```
Consistency = inverse CV of monthly SPI scores. Leadership = task completion + mentoring signals. Demand stability = booking velocity variance.

### Career Stage Thresholds
| Stage | SPI Min | ORS Min | Additional |
|---|---|---|---|
| Stylist | 0 | — | Default |
| High Performer | 70 | — | — |
| Lead | 80 | — | Leadership score ≥ 60 |
| Operator | 80 | 70 | Consistency ≥ 70 |
| Owner | 85 | 85 | All hard filters pass |

### Micro-Financing Thresholds
| Use Case | SPI Min | ORS Min | Max Amount |
|---|---|---|---|
| Marketing Boost | 65 | — | $5,000 |
| Inventory Scaling | 70 | — | $10,000 |
| Chair Expansion | 75 | 60 | $15,000 |
| Mini Location | 80 | 75 | $50,000 |

### Repayment Models
- **Fixed**: Equal monthly payments (existing behavior)
- **Revenue-based**: % of service revenue until repaid (configurable 5-15%)
- **Hybrid**: Minimum payment + % of upside above baseline

## Build Order

1. DB migration (3 new tables + 2 alter tables)
2. `stylist-financing-config.ts` (thresholds, career stages, repayment models)
3. `stylist-spi-engine.ts` (pure computation: SPI, ORS, career stage)
4. `compute-stylist-spi` edge function
5. `useStylistSPI.ts` + `useStylistFinancingEligibility.ts` hooks
6. Update `financing-engine.ts` with stylist-level eligibility
7. UI: `OwnershipTrackCard`, `StylistSPICard`, `MicroFinancingOpportunities`, `CareerMilestoneTimeline`
8. Wire into stylist dashboard + admin capital dashboard
9. Export updates

## Technical Notes

- Stylist SPI is deterministic — computed from existing appointment, revenue, and retention data already tracked by the platform
- ORS requires 6 months of SPI history for the consistency component; falls back to current SPI with a penalty multiplier if insufficient history
- Career stage transitions are logged as milestones for auditability — the system recommends but never auto-promotes
- Micro-financing reuses the existing Stripe checkout flow via `create-financing-checkout` edge function; the only addition is stylist-scoped opportunity creation
- Revenue-based repayment is tracked via `financed_project_ledger` entries; actual collection integration with Stripe subscriptions is a future enhancement
- All financing is presented as opportunity-driven ("You can increase monthly revenue by +$X") — never as a loan application
- Stylists see only their own SPI/ORS; admins see all stylists in their org; platform admins see network-wide
- The `compute-stylist-spi` edge function runs on a schedule (daily) or can be triggered on-demand by admins

