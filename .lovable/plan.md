

# Zura Capital — Two-Layer Eligibility Model (Stripe + Zura Guardrails)

## Completed

### Architecture Change: Stripe Capital Alignment

Realigned Zura Capital from a custom 19-check eligibility engine to a two-layer model:

**Layer 1 — Stripe Capital Underwriting (Stripe-owned)**
Stripe reviews connected accounts daily based on processing history, volume, growth, disputes, etc. Zura cannot influence this — it can only surface offers Stripe has already approved.

**Layer 2 — Zura Operational Guardrails (Zura-owned)**
Before surfacing a Stripe-approved offer, Zura checks 6 operational readiness conditions:
- No critical ops alerts
- No active repayment distress
- Under max concurrent project limit
- No underperforming projects
- Decline cooldown clear
- Underperformance cooldown clear

### Files Changed

| File | Change |
|---|---|
| `src/config/capital-engine/capital-formulas-config.ts` | Added `STRIPE_CAPITAL_REQUIREMENTS` and `ZURA_OPERATIONAL_GUARDRAILS` constants |
| `src/lib/capital-engine/capital-formulas.ts` | Added `calculateOperationalReadiness` and `calculateOpportunityRanking`; kept `calculateInternalEligibility` for backward compat |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Replaced 19-check reference with two-section Stripe Requirements + Zura Guardrails view |
| `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx` | Updated to explain two-layer model with new FAQ entries |
| `src/hooks/useOrgCapitalDiagnostics.ts` | Added operational readiness and ranking results to diagnostics |
| `supabase/functions/detect-capital-opportunities/index.ts` | New edge function: polls Stripe Capital API for financing offers |
| DB migration | Added `stripe_offer_id` and `provider_offer_details` columns to `capital_funding_opportunities` |

### Prerequisites for Live Detection

1. Stripe Connect accounts must have Capital for Platforms enabled
2. Locations need `stripe_account_id` populated
3. The `detect-capital-opportunities` edge function needs to be scheduled (cron) or triggered manually
