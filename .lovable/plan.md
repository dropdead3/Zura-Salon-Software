

# Stripe Financing Layer for Capital & Expansion Engine

## What It Builds

A conditional financing execution layer embedded within the Capital & Expansion Engine. Financing is not a standalone feature — it surfaces only when a validated expansion opportunity exceeds deterministic ROE, confidence, and risk thresholds. Eligible opportunities display a "Fund This" action that initiates a Stripe-backed financing flow pre-filled with the modeled investment amount. Post-funding, the system tracks repayment progress, realized revenue lift, and variance from predictions.

## Architecture

```text
Expansion Opportunity (validated)
     │
     ├── Financing Eligibility Engine (deterministic)
     │   ├── ROE ≥ 1.5x
     │   ├── Confidence = high or medium
     │   ├── Risk ≤ moderate
     │   └── All hard filters pass → eligible
     │
     ├── "Fund This" Action
     │   └── Stripe Checkout (pre-filled amount from capital model)
     │
     ├── Financed Project Tracking
     │   ├── Repayment schedule & progress
     │   ├── Realized revenue lift vs predicted
     │   └── Variance alerts
     │
     └── Capital Dashboard integration
```

## Database Changes

**New table: `financed_projects`**
- `id`, `organization_id` (FK), `opportunity_id` (FK `expansion_opportunities`)
- `stripe_checkout_session_id` (text), `stripe_subscription_id` (text, nullable)
- `funded_amount` (numeric), `predicted_annual_lift` (numeric), `predicted_break_even_months` (numeric)
- `roe_at_funding` (numeric), `confidence_at_funding` (text), `risk_level_at_funding` (text)
- `status` (enum: `pending_payment`, `active`, `completed`, `defaulted`, `cancelled`)
- `repayment_total` (numeric, default 0), `repayment_remaining` (numeric, default 0)
- `realized_revenue_lift` (numeric, default 0), `variance_pct` (numeric, nullable)
- `funded_at` (timestamptz), `target_completion_at` (timestamptz), `completed_at` (timestamptz, nullable)
- `created_at`, `updated_at`
- RLS: org member read, org admin write

**New table: `financed_project_ledger`**
- `id`, `financed_project_id` (FK), `organization_id`
- `entry_type` (enum: `repayment`, `revenue_lift_recorded`, `adjustment`)
- `amount` (numeric), `description` (text), `recorded_at` (timestamptz), `created_at`
- RLS: org member read, org admin write

## Eligibility Logic (Deterministic)

An opportunity qualifies for financing when ALL conditions are met:
- ROE ≥ 1.5x (configurable via `FINANCING_THRESHOLDS`)
- Confidence is `high` or `medium`
- Risk level is `low` or `moderate`
- Status is `identified` or `evaluating` (not dismissed/completed)
- Capital required ≥ $5,000 minimum (configurable)

This is a pure function — no AI involvement in eligibility determination.

## New Files

| File | Purpose |
|---|---|
| `src/config/capital-engine/financing-config.ts` | Eligibility thresholds (min ROE, allowed confidence/risk levels, min capital), status labels, repayment term defaults |
| `src/lib/capital-engine/financing-engine.ts` | Pure computation: `isFinancingEligible()`, `computePostFinancingCashFlow()`, `computeVariance()`, `computeRepaymentSchedule()` |
| `src/hooks/useFinancedProjects.ts` | Queries `financed_projects` + `financed_project_ledger`; mutations for status updates and ledger entries |
| `src/components/dashboard/capital-engine/FinancingEligibilityBadge.tsx` | Small badge/indicator on eligible opportunities in the Capital Priority Queue |
| `src/components/dashboard/capital-engine/FundThisDialog.tsx` | Modal: shows investment summary (ROE, lift, break-even, post-financing cash flow), initiates Stripe checkout |
| `src/components/dashboard/capital-engine/FinancedProjectsTracker.tsx` | Card showing active financed projects: repayment progress, realized lift vs predicted, variance |
| `supabase/functions/create-financing-checkout/index.ts` | Edge function: validates eligibility server-side, creates Stripe checkout session with pre-filled amount, records `financed_projects` row with `pending_payment` status |
| `supabase/functions/financing-webhook/index.ts` | Edge function: handles `checkout.session.completed` webhook to activate financed project |

## Modified Files

| File | Change |
|---|---|
| `src/components/dashboard/capital-engine/CapitalPriorityQueue.tsx` | Add `FinancingEligibilityBadge` + "Fund This" button per eligible row |
| `src/components/dashboard/capital-engine/CapitalDashboard.tsx` | Add `FinancedProjectsTracker` card below expansion simulator |
| `src/lib/capital-engine/index.ts` | Export financing engine functions |
| `src/config/capital-engine/index.ts` | Export financing config |

## Edge Function: `create-financing-checkout`

1. Authenticate caller, verify org admin
2. Load expansion opportunity by ID, verify org ownership
3. Run `isFinancingEligible()` server-side (re-validate — never trust client)
4. Create Stripe checkout session with `mode: 'payment'`, amount = `capital_required` (in cents), metadata includes `opportunity_id` and `organization_id`
5. Insert `financed_projects` row with status `pending_payment`
6. Return checkout URL

## Edge Function: `financing-webhook`

1. Verify Stripe webhook signature
2. On `checkout.session.completed`: update `financed_projects` status to `active`, set `funded_at`
3. On `checkout.session.expired`: update status to `cancelled`

## UI: Fund This Flow

```text
Capital Priority Queue Row
┌──────────────────────────────────────────────┐
│ 1  Mesa Extensions  2.3x ROE  $45K → $104K  │
│    Location Expansion · Mesa   12mo payback  │
│    [ELIGIBLE] ──────────── [Fund This]       │
└──────────────────────────────────────────────┘

Fund This Dialog
┌──────────────────────────────────────────────┐
│ FUND: Mesa Extensions                        │
│                                              │
│ Investment      $45,000                      │
│ Predicted Lift  $104,000/yr                  │
│ ROE             2.3x                         │
│ Break-Even      12 months                    │
│ Post-Financing  +$4,917/mo net cash flow     │
│                                              │
│ Risk: Moderate · Confidence: High            │
│                                              │
│         [Proceed to Payment]                 │
└──────────────────────────────────────────────┘
```

## Financed Projects Tracker

```text
┌──────────────────────────────────────────────┐
│ FINANCED PROJECTS                            │
│                                              │
│ Mesa Extensions        Status: Active        │
│ Funded: $45,000        6 of 12 months        │
│ Realized Lift: $48,200  (vs $52,000 pred.)   │
│ Variance: -7.3%        On Track              │
└──────────────────────────────────────────────┘
```

## Build Order

1. DB migration (2 new tables + enums + RLS)
2. `financing-config.ts` (thresholds, labels)
3. `financing-engine.ts` (eligibility, cash flow, variance computation)
4. `create-financing-checkout` edge function
5. `financing-webhook` edge function
6. `useFinancedProjects.ts` hook
7. UI: `FinancingEligibilityBadge`, `FundThisDialog`, `FinancedProjectsTracker`
8. Wire into `CapitalPriorityQueue` and `CapitalDashboard`
9. Export updates

## Technical Notes

- Financing eligibility is deterministic — computed from ROE, confidence, and risk level only. AI is used only for generating user-facing summaries of why an opportunity qualifies
- Server-side re-validation in the edge function prevents client-side manipulation of eligibility
- The webhook pattern follows the existing Stripe integration patterns already in the codebase (e.g., `create-backroom-checkout`)
- `STRIPE_SECRET_KEY` is already configured in the environment — no new secrets needed
- Repayment tracking is manual/admin-driven (ledger entries) — Stripe subscription-based repayment is a future enhancement
- Variance computation: `(realized_lift - predicted_lift) / predicted_lift * 100`
- No arbitrary loan requests — financing is only accessible through validated expansion opportunities
- Follows the Recommend → Approve → Execute autonomy model — "Fund This" requires explicit admin action

