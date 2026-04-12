

# Align Zura Capital with Stripe Capital + Build Opportunity Detection

## Key Finding: The 19 Checks Are Not Stripe's Criteria

The current 19-check eligibility engine (ROE ratio, confidence score, momentum, etc.) is **entirely custom Zura logic** with no relationship to how Stripe Capital actually works. Here is what Stripe Capital actually requires vs. what Zura currently checks:

### Stripe Capital's Actual Underwriting (What Stripe Evaluates)

Stripe determines eligibility automatically based on:
1. **3+ months of payment processing history** on Stripe
2. **$5,000+ annual processing volume** and $1,000+ average over last 3 months
3. **Growth trajectory** — positive payment volume trends
4. **Steady processing record** — consistent volume, few zero periods
5. **Large customer base** — more unique customers = more likely eligible
6. **Low dispute rate** — few unresolved chargebacks
7. **US-based business** with physical address
8. **Good standing** with Stripe Capital (no rejection in last 30 days)

Stripe runs this review **daily and automatically**. Platforms cannot influence the underwriting decision — they can only surface offers Stripe has already approved.

### What This Means for Zura

Zura is operating as a **Stripe Connect platform** (each salon location has a `stripe_account_id`). In the Capital for Platforms model:

- **Stripe decides who gets offers** — not Zura
- **Zura's role** is to surface those offers, send notifications, and embed the application flow
- The 19 internal checks (ROE, confidence, momentum, etc.) are **Zura's own pre-filter** on top of Stripe's decision — they are not Stripe requirements

This explains why Drop Dead Salons sees nothing: there is no detection engine populating `capital_funding_opportunities`, AND the custom thresholds are unrelated to what Stripe actually evaluates.

## Proposed Architecture

### Two-Layer Model

```text
Layer 1: Stripe Capital Eligibility (Stripe-owned)
  Stripe reviews connected accounts daily.
  When eligible, Stripe creates a financing offer.
  Zura listens via webhook or polls the Capital API.

Layer 2: Zura Operational Readiness (Zura-owned)
  Before surfacing a Stripe-approved offer to the org,
  Zura applies a lighter operational readiness check:
  - No critical ops alerts
  - No active repayment distress
  - Under max concurrent project limit
  - Not in decline cooldown
  These are guardrails, not underwriting.
```

### Changes

#### 1. Realign the Eligibility Reference (UI + Config)

Replace the current 19-check reference list in the Control Tower with two sections:

**Section A — Stripe Capital Requirements** (what Stripe evaluates):
- 3+ months processing history
- $5K+ annual / $1K+ monthly average volume
- Positive growth trajectory
- Consistent processing (few zero-volume periods)
- Diverse customer base
- Low dispute rate
- US-based, good standing

**Section B — Zura Operational Guardrails** (what Zura additionally checks before surfacing):
- No critical operational alerts
- No active repayment distress
- Under max concurrent funded projects
- Not in decline/underperformance cooldown

Remove the checks that are purely internal scoring artifacts and not actionable guardrails (ROE ratio, confidence score, momentum score, execution readiness, operational stability, risk level, constraint type, freshness, investment amount, location/stylist exposure). These are useful for **ranking** opportunities once they exist, but they should not gate eligibility.

#### 2. Build the Opportunity Detection Pipeline (Edge Function)

Create a scheduled edge function `detect-capital-opportunities` that:

1. Queries all organizations with `capital_enabled = true`
2. For each org, checks their Stripe Connect accounts for Capital financing offers (via Stripe Capital API)
3. When Stripe has an approved offer, creates a row in `capital_funding_opportunities` with the offer details
4. Runs Zura's operational guardrail checks to set `eligibility_status`
5. Marks `stripe_offer_available = true` with provider offer details

This requires Stripe Capital for Platforms to be enabled on the Stripe Connect account. If it is not yet enabled, the edge function should log that and the Control Tower should show a clear status indicating Capital for Platforms setup is pending.

#### 3. Update the Knowledge Base

Update the Capital guide (`/platform/capital/guide`) to clearly distinguish between Stripe's underwriting criteria and Zura's operational guardrails, so platform admins understand the two-layer model.

#### 4. Simplify `calculateInternalEligibility`

Refactor the eligibility engine to separate **ranking** (ROE, confidence, momentum — used for prioritizing which opportunities to show first) from **gating** (operational guardrails — used to block surfacing). Currently all 19 checks are hard gates. Most should become ranking inputs instead.

## File Summary

| File | Change |
|---|---|
| `src/config/capital-engine/capital-formulas-config.ts` | Add `STRIPE_CAPITAL_REQUIREMENTS` reference constant; slim `DEFAULT_CAPITAL_POLICY` to operational guardrails only |
| `src/lib/capital-engine/capital-formulas.ts` | Split `calculateInternalEligibility` into `calculateOperationalReadiness` (gating) and `calculateOpportunityRanking` (scoring) |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Replace 19-check reference with two-section view (Stripe Requirements + Zura Guardrails) |
| `src/hooks/useOrgCapitalDiagnostics.ts` | Update diagnostics to reflect two-layer model |
| `supabase/functions/detect-capital-opportunities/index.ts` | New edge function: polls Stripe Capital API for offers, populates `capital_funding_opportunities` |
| Capital Knowledge Base page | Update documentation to explain two-layer model |

## Technical Detail

### Stripe Capital API Integration

For the detection pipeline, Zura would use the Stripe Capital for Platforms API:
- Listen for `capital.financing_offer.fully_extended` webhook events
- Or poll `GET /v1/capital/financing_offers?connected_account={acct_id}` for each connected account
- Map Stripe offer fields (`offered_amount`, `fee_amount`, `paid_out_at`, `expires_after`) to `capital_funding_opportunities` columns

### Prerequisites

Before the detection pipeline can work:
1. Stripe Connect must be configured with Capital for Platforms enabled
2. Each organization's locations must have valid `stripe_account_id` values
3. The Stripe account must have the Capital product enabled

### Why Drop Dead Salons Sees Nothing

The `capital_funding_opportunities` table is empty because no code exists to populate it. The 19-check reference is a red herring — even if every check passed, there would be nothing to evaluate. The real blocker is the missing detection pipeline.

