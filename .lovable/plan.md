

# Zura Capital — Production Build Spec Implementation

## Gap Analysis

The production spec introduces a fundamentally different data architecture from what currently exists. The current system extends `expansion_opportunities` and `financed_projects` with additional columns. The production spec calls for **dedicated Zura Capital tables** (`capital_funding_opportunities`, `capital_provider_offers`, `capital_funding_projects`, `capital_surface_state`, `capital_policy_settings`) with significantly richer schemas — including cents-based money storage, state machines, surface suppression, and activation tracking.

**What exists and is reusable:**
- Eligibility engine (`zura-eligibility-engine.ts`) — solid, needs threshold adjustments
- Config (`zura-capital-config.ts`) — solid, needs event type and status expansions
- Financing engine (`financing-engine.ts`) — cash flow, variance computation reusable
- Capital event log table — exists but schema is simpler than spec
- `ZuraCapitalCard`, `FundingOpportunityDetail`, `OwnerCapitalQueue` — exist, need data source migration
- `create-financing-checkout` + `financing-webhook` edge functions — exist, need rewiring
- Command Center integration — already wired

**What the production spec requires that doesn't exist:**
- `capital_funding_opportunities` table (production-grade, cents-based, full state machine, surface priority, provider offer denormalization, activation timestamps)
- `capital_provider_offers` table (replaces simpler `capital_offer_snapshots`)
- `capital_funding_projects` table (replaces `financed_projects` for capital-specific tracking with activation_status, ROI, variance, performance status)
- `capital_surface_state` table (per-surface suppression and cooldown)
- `capital_policy_settings` table (org-level configurable thresholds)
- Provider abstraction layer (interface for eligibility, offers, initiation, sync)
- Surface priority formula computation
- Post-funding activation logic (linking campaigns, tasks, inventory orders)
- Surface selection logic (filtering by surface area type)

## Architecture Decision

**Create the new production tables alongside existing ones.** The existing `expansion_opportunities` and `financed_projects` remain as source/legacy data — the new `capital_*` tables represent the production Zura Capital system. This avoids breaking existing features while building the production layer.

The hook layer (`useZuraCapital`) will be rewired to query from `capital_funding_opportunities` instead of `expansion_opportunities`. The edge functions will write to the new tables.

## Build Order

### 1. Database Migration
Create 5 new tables:
- `capital_funding_opportunities` — full spec schema with cents integers, all timestamps, surface priority, provider offer denormalization, constraint/opportunity type text fields, eligibility/status text fields
- `capital_provider_offers` — normalized provider snapshots with unique index on provider_offer_id
- `capital_funding_projects` — funded execution instances with activation_status, performance tracking, variance, ROI
- `capital_surface_state` — per-surface suppression with cooldowns and dismiss tracking
- `capital_policy_settings` — org-level configurable thresholds with platform defaults

All tables: RLS enabled, org-scoped, proper indexes per spec.

### 2. Config Updates (`zura-capital-config.ts`)
- Add production state machine statuses for funding opportunities and projects
- Add `SURFACE_COOLDOWN_DEFAULTS` per surface area
- Add `SURFACE_PRIORITY_WEIGHTS` for the ranking formula
- Add `ACTIVATION_STATUS` types
- Expand `CAPITAL_EVENT_TYPES` to cover full event stream (opportunity_detected, internal_eligibility_passed, provider_check_requested, etc.)
- Add `REPAYMENT_STATUS` types

### 3. Provider Abstraction (`src/lib/capital-engine/capital-provider.ts`)
- Define `CapitalProvider` interface: `checkEligibility`, `getOffers`, `initiateFunding`, `syncFundingStatus`, `syncRepaymentStatus`
- Define `ProviderEligibilityResult`, `ProviderOffer`, `ProviderInitiationResult`, `FundingStatusResult`, `RepaymentStatusResult` types
- Implement `StripeCapitalProvider` as first-class implementation (wraps edge function calls)

### 4. Surface Priority Engine (`src/lib/capital-engine/surface-priority-engine.ts`)
- Pure computation: `computeSurfacePriority(opportunity, context) → number`
- Formula: `(roe * 0.35) + (confidence * 0.20) + (business_value * 0.15) + (momentum * 0.10) + (urgency * 0.10) + (constraint_severity * 0.10)` minus penalties for staleness, active projects, dismissals, cooldowns
- `selectForSurface(opportunities, surfaceArea, limits, surfaceState) → filtered + ranked`

### 5. Hooks Rewrite
- **`useZuraCapital.ts`** — rewrite to query `capital_funding_opportunities` instead of `expansion_opportunities`. Add surface area filtering. Include `capital_policy_settings` for threshold overrides.
- **`useCapitalProjects.ts`** (new) — query `capital_funding_projects` with performance data, activation status
- **`useCapitalSurfaceState.ts`** (new) — manage surface suppression/dismissal per opportunity per surface
- **`useCapitalEventLog.ts`** — extend with full event type support and project-level events
- **`useCapitalPolicySettings.ts`** (new) — read/write org-level policy settings

### 6. Edge Function Updates
- **`create-financing-checkout`** — rewire to read from `capital_funding_opportunities`, write to `capital_funding_projects`, log full event stream
- **`financing-webhook`** — rewire to update `capital_funding_projects`, set activation_status, log funded event

### 7. UI Component Updates
- **`ZuraCapitalCard`** — update data source to new hook, use cents-based formatting
- **`FundingOpportunityDetail`** — add Execution Plan section, Net Impact with coverage ratio, surface area tracking, dismiss action with surface-specific cooldown
- **`OwnerCapitalQueue`** — add filters (location, service, type, status, risk), use surface priority ranking
- **`FinancedProjectsTracker`** — show activation_status, performance status badge, variance, ROI from new `capital_funding_projects`
- **`CapitalDashboard`** — add policy settings access for admin

### 8. Export Updates
- `src/lib/capital-engine/index.ts` — export provider types, surface priority engine
- `src/config/capital-engine/index.ts` — already exporting zura-capital-config

## Key Technical Decisions

- **Money in cents**: All `_cents` fields are integers. Format with `(value / 100)` before display. Existing `formatCurrency` handles this if passed the dollar value.
- **State machine enforcement**: Status transitions validated in hooks/edge functions, not just in config.
- **Surface suppression**: `capital_surface_state` is queried alongside opportunities to filter dismissed/cooled-down items per surface.
- **Provider abstraction**: TypeScript interface only — Stripe is the sole implementation. The abstraction exists so future providers slot in without rewriting core logic.
- **Backward compatibility**: Existing `expansion_opportunities` data continues to work for non-capital features. The capital layer reads from its own tables.

## Files Created

| File | Purpose |
|---|---|
| Migration SQL | 5 new tables with RLS, indexes, triggers |
| `src/lib/capital-engine/capital-provider.ts` | Provider abstraction interface + Stripe implementation |
| `src/lib/capital-engine/surface-priority-engine.ts` | Surface priority computation + surface selection |
| `src/hooks/useCapitalProjects.ts` | Query `capital_funding_projects` |
| `src/hooks/useCapitalSurfaceState.ts` | Surface suppression management |
| `src/hooks/useCapitalPolicySettings.ts` | Org-level policy settings |

## Files Modified

| File | Change |
|---|---|
| `src/config/capital-engine/zura-capital-config.ts` | Expanded statuses, event types, surface cooldowns, priority weights |
| `src/hooks/useZuraCapital.ts` | Rewired to `capital_funding_opportunities` |
| `src/hooks/useCapitalEventLog.ts` | Extended event types |
| `src/components/dashboard/capital-engine/ZuraCapitalCard.tsx` | New data source |
| `src/components/dashboard/capital-engine/FundingOpportunityDetail.tsx` | Execution plan, dismiss action, coverage display |
| `src/components/dashboard/capital-engine/OwnerCapitalQueue.tsx` | Filters, surface priority ranking |
| `src/components/dashboard/capital-engine/FinancedProjectsTracker.tsx` | New data source, activation/performance status |
| `src/components/dashboard/capital-engine/CapitalDashboard.tsx` | Policy settings link |
| `supabase/functions/create-financing-checkout/index.ts` | New table references |
| `supabase/functions/financing-webhook/index.ts` | New table references |
| `src/lib/capital-engine/index.ts` | New exports |

## Phase Scope

This build covers **Phase 1 + Phase 2 foundations**: tables, provider abstraction, eligibility, surface priority, Command Center card, detail panel, capital queue with filters, funded project tracking, edge function rewiring. Operations Hub and service dashboard surfacing are Phase 2 follow-ups. Stylist micro-funding is Phase 3.

