

# Zura Capital — Master Build

## Current State Assessment

The existing codebase has a solid foundation but is limited in scope:

**What exists:**
- `expansion_opportunities` table with basic fields (title, capital_required, predicted_annual_lift, roe_score, confidence, risk_factors, status)
- `financed_projects` + `financed_project_ledger` tables for post-funding tracking
- `financing-engine.ts` with deterministic eligibility (ROE ≥ 1.5x, confidence, risk, capital min)
- `capital-engine.ts` with SPI scoring, ROE computation, risk modeling, queue ranking
- `stylist-spi-engine.ts` with individual SPI, ORS, career stage logic
- `create-financing-checkout` and `financing-webhook` edge functions
- `CapitalDashboard`, `CapitalPriorityQueue`, `FundThisDialog`, `FinancedProjectsTracker` UI components
- Financing only surfaces inside the Capital Dashboard page

**What the spec requires but doesn't exist:**
- `funding_opportunities` model (richer than current `expansion_opportunities` — needs ranges for lift/break-even, momentum/business_value/effort scores, constraint_type, eligibility states, Stripe offer metadata, recommended_action_label, expires_at)
- `capital_offer_snapshots` table (normalized Stripe offer data)
- `capital_event_log` table (surfacing/click/funding audit trail)
- `funding_performance` model (richer than current `financed_projects` — needs variance tracking, ROI, break-even progress, synced state)
- Zura eligibility engine (pre-Stripe validation with exposure limits, operational stability checks, cooldowns)
- Stripe Capital offer retrieval (checking if Stripe Capital offers are available for the connected account)
- Command Center capital card
- Operations Hub contextual surfacing
- Service dashboard surfacing
- Stylist dashboard surfacing
- Owner-level global capital queue page
- Opportunity detail panel/page
- Capital event logging throughout
- Post-funding automatic workflow activation
- Risk controls (max concurrent projects, exposure limits, cooldowns)
- Surfacing rate analytics

## Architecture Decision

Rather than replacing `expansion_opportunities` and `financed_projects`, we **extend** them with the missing fields and create the new tables alongside. This preserves all existing data and edge function compatibility.

## Phase 1 — Foundation (This Build)

### Database Migration

**Alter `expansion_opportunities`** — add missing fields:
- `service_id UUID`, `campaign_id UUID` (nullable FKs)
- `summary TEXT`
- `predicted_revenue_lift_low NUMERIC`, `predicted_revenue_lift_high NUMERIC` (rename existing `predicted_annual_lift` as the "expected" band)
- `predicted_booking_lift_low/expected/high NUMERIC`
- `break_even_months_low NUMERIC`, `break_even_months_high NUMERIC` (existing `break_even_months` becomes the "expected")
- `momentum_score NUMERIC`, `business_value_score NUMERIC`, `effort_score NUMERIC`
- `constraint_type TEXT`
- `eligibility_status TEXT DEFAULT 'detected'`
- `stripe_offer_available BOOLEAN DEFAULT false`
- `stripe_offer_id TEXT`, `stripe_offer_amount NUMERIC`, `stripe_offer_terms_summary TEXT`
- `recommended_action_label TEXT DEFAULT 'Fund This'`
- `expires_at TIMESTAMPTZ`

**Alter `financed_projects`** — add missing fields:
- `funding_source TEXT DEFAULT 'stripe'`
- `estimated_total_repayment NUMERIC`
- `actual_total_repayment_to_date NUMERIC DEFAULT 0`
- `expected_monthly_payment NUMERIC`
- `actual_monthly_payment NUMERIC`
- `revenue_generated_to_date NUMERIC DEFAULT 0`
- `predicted_revenue_to_date NUMERIC DEFAULT 0`
- `roi_to_date NUMERIC`
- `break_even_progress_percent NUMERIC DEFAULT 0`
- `last_synced_at TIMESTAMPTZ`

**New table: `capital_offer_snapshots`**
- `id`, `organization_id`, `opportunity_id` (FK expansion_opportunities)
- `provider TEXT DEFAULT 'stripe'`, `provider_offer_id TEXT`
- `eligible BOOLEAN`, `offered_amount NUMERIC`, `term_length INTEGER`
- `repayment_model TEXT`, `estimated_payment_amount NUMERIC`, `fees_summary TEXT`
- `fetched_at TIMESTAMPTZ DEFAULT now()`, `expires_at TIMESTAMPTZ`
- `raw_snapshot_json JSONB`
- RLS: org admin read/write

**New table: `capital_event_log`**
- `id`, `organization_id`, `user_id UUID`
- `opportunity_id UUID` (FK expansion_opportunities)
- `event_type TEXT` (surfaced, viewed, clicked, initiated, funded, declined, completed)
- `surface_area TEXT` (command_center, ops_hub, service_dashboard, stylist_dashboard, capital_queue, expansion_planner)
- `metadata_json JSONB`
- `created_at TIMESTAMPTZ DEFAULT now()`
- RLS: org admin read, authenticated insert

### Zura Eligibility Engine

**New file: `src/lib/capital-engine/zura-eligibility-engine.ts`**

Deterministic pre-Stripe validation:

```text
isZuraEligible(opportunity, orgContext) → { eligible, reasons[] }

Checks:
- ROE ≥ 1.8x (configurable)
- Confidence ≥ 70 (configurable)
- Risk ≤ medium
- Momentum not in severe decline
- No unresolved critical operational alerts (orgContext)
- Active funded projects < max concurrent limit
- No underperforming funded project beyond tolerance
- Opportunity not stale/expired
- Clear use of funds mapped (constraint_type exists)
```

**New file: `src/config/capital-engine/zura-capital-config.ts`**

```text
ZURA_ELIGIBILITY_THRESHOLDS
  minROE: 1.8
  minConfidence: 70
  maxRisk: 'medium'
  maxConcurrentFundedProjects: 3
  maxExposurePerLocation: 200_000
  maxExposurePerStylist: 50_000
  cooldownAfterDeclineDays: 30
  cooldownAfterUnderperformingDays: 60
  underperformanceVarianceThreshold: -25
  maxStaleDays: 90
  
FUNDING_OPPORTUNITY_STATUSES: [detected, eligible_internal, eligible_provider, surfaced, viewed, initiated, pending_provider, funded, declined, expired, canceled, completed, underperforming]

FUNDING_PERFORMANCE_STATUSES: [not_started, active, on_track, above_forecast, below_forecast, at_risk, repaid, closed]

OPPORTUNITY_TYPES: [capacity_expansion, inventory_expansion, service_growth, location_expansion, new_location_launch, stylist_capacity_growth, campaign_acceleration, equipment_expansion, marketing_acceleration]

CONSTRAINT_TYPES: [capacity_bottleneck, inventory_bottleneck, strong_demand, market_opportunity, stylist_ready_to_scale, page_or_campaign_growth_gap, service_waitlist_pressure, understocking_risk]
```

### Hooks

**New: `src/hooks/useZuraCapital.ts`**
- Fetches eligible funding opportunities (joins opportunity + org context)
- Computes Zura eligibility client-side for display gating
- Provides `topOpportunity`, `eligibleCount`, `activeProjects`
- Logs surfacing events via `capital_event_log`

**New: `src/hooks/useCapitalEventLog.ts`**
- Mutation to insert `capital_event_log` entries
- Query for analytics (surfacing rate, clickthrough)

**Modify: `src/hooks/useFinancedProjects.ts`**
- Extend query to include new fields (roi_to_date, break_even_progress_percent)

### UI Components — Phase 1

**New: `src/components/dashboard/capital-engine/ZuraCapitalCard.tsx`**
Command Center pinnable card. Shows top opportunity with:
- Title, summary, constraint reason
- Investment amount, expected lift (with range), break-even, ROE
- Stripe funding availability + coverage ratio
- "Fund This" or "Activate Growth" CTA
- Secondary states: "No active capital opportunities" / "Growth funding unavailable"

**New: `src/components/dashboard/capital-engine/FundingOpportunityDetail.tsx`**
Full detail panel (dialog or route) with sections:
- Opportunity Summary
- Growth Math (investment, lift range, booking lift, break-even range, ROE, confidence, risk)
- Funding Availability (provider, amount, coverage ratio, payment summary)
- Net Impact (monthly lift - repayment = net cash flow, time to break-even)
- Why This Makes Sense (deterministic explanation from signals)
- Execution Plan (what activates if funded)
- Tracking (if already funded)

**New: `src/components/dashboard/capital-engine/OwnerCapitalQueue.tsx`**
Owner-level ranked list of all capital opportunities across org. Columns: title, location, service, investment, expected lift, ROE, confidence, risk, status.

**Modify: `CapitalDashboard.tsx`**
- Replace existing layout with owner-level capital queue as the primary view
- Keep FinancedProjectsTracker
- Add ZuraCapitalCard at top

**Modify: `FundThisDialog.tsx`**
- Add Stripe offer coverage ratio display when offer amount differs from recommended investment
- Add lift ranges (low/expected/high)
- Change CTA copy to match `recommended_action_label`

**Modify: `FinancedProjectsTracker.tsx`**
- Display ROI, break-even progress percentage
- Show funding_performance status (on_track, at_risk, etc.)

### Command Center Integration

**Modify: `CommandCenterAnalytics.tsx`**
- Add `zura_capital` as a pinnable card option
- Render `ZuraCapitalCard` when pinned and at least one eligible opportunity exists

### Edge Function Updates

**Modify: `create-financing-checkout`**
- Run Zura eligibility check (exposure limits, concurrent project cap) in addition to existing threshold checks
- Log `initiated` event to `capital_event_log`
- If Stripe offer data exists, use offer amount vs recommended investment for coverage display

**Modify: `financing-webhook`**
- On `checkout.session.completed`: also insert `funded` event to `capital_event_log`
- Update expanded fields on financed_projects (estimated_total_repayment, expected_monthly_payment)

### Export Updates

Update `src/lib/capital-engine/index.ts` and `src/config/capital-engine/index.ts` to export new modules.

## Phase 2 — Operational Integration (Follow-up)

- Operations Hub contextual surfacing cards
- Service dashboard surfacing
- Automatic post-funding task/campaign activation
- Repayment and performance sync

## Phase 3 — Advanced Surfacing (Follow-up)

- Stylist micro-funding in stylist dashboard
- Expansion planner integration
- Campaign acceleration funding
- Cross-location prioritization

## Phase 4 — Optimization (Follow-up)

- Performance-based suppression
- Prediction calibration
- Capital efficiency analytics
- Provider abstraction layer

## Build Order (Phase 1)

1. DB migration (alter 2 tables + 2 new tables)
2. `zura-capital-config.ts` (thresholds, status enums, types)
3. `zura-eligibility-engine.ts` (pure deterministic eligibility)
4. `useCapitalEventLog.ts` hook
5. `useZuraCapital.ts` hook
6. `ZuraCapitalCard.tsx` (Command Center card)
7. `FundingOpportunityDetail.tsx` (detail panel)
8. `OwnerCapitalQueue.tsx` (owner-level queue)
9. Update `CapitalDashboard.tsx`, `FundThisDialog.tsx`, `FinancedProjectsTracker.tsx`
10. Wire `ZuraCapitalCard` into `CommandCenterAnalytics.tsx`
11. Update edge functions with Zura eligibility + event logging
12. Export updates

## Technical Notes

- Zura eligibility is a strict superset of existing financing eligibility — existing thresholds (ROE ≥ 1.5x) are raised to 1.8x for Zura Capital surfacing, while the lower threshold remains for the Stripe checkout guard
- `expansion_opportunities` is preserved and extended rather than replaced — all existing data, RLS policies, and hooks continue to work
- Provider abstraction is designed in (provider field, offer snapshots table) but Stripe is the only first-class implementation
- Capital event logging enables surfacing rate and conversion analytics without requiring external tracking
- No arbitrary financing forms — every "Fund This" action traces back to a validated opportunity object
- AI is used only for the "Why This Makes Sense" explanation copy; all eligibility, scoring, and ranking is deterministic

