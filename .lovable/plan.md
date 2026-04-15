

## Stripe Fraud Prevention & Dispute Management Enhancement

### What Exists Today
- `payment_disputes` table with webhook sync
- Dispute card in Payment Ops with status/amount tracking
- Auto-ban policy setting
- Client "Dispute Risk" segmentation

### What We'll Add

**Phase 1: Enhanced Dispute Management (immediate value)**

1. **Evidence Submission Flow**
   - Add "Submit Evidence" action button on disputes with `needs_response` status
   - Dialog with fields: cancellation policy disclosure, service documentation notes, uncategorized rebuttal text
   - Edge function `submit-dispute-evidence` calls Stripe's dispute update API to submit evidence
   - Track submission status in `payment_disputes` table (new `evidence_submitted_at` column)

2. **Early Fraud Warning Capture**
   - Add `radar.early_fraud_warning.created` to the existing `stripe-webhook` handler
   - New `fraud_warnings` table: `organization_id`, `charge_id`, `fraud_type`, `actionable`, `created_at`
   - Surface warnings in Payment Ops as a new "Fraud Alerts" section with proactive refund action

3. **Dispute Analytics Dashboard**
   - Win/loss rate card
   - Dispute-to-transaction ratio
   - Breakdown by reason (fraudulent, product not received, duplicate, etc.)
   - Monthly trend chart
   - Total revenue lost to disputes

**Phase 2: Radar Risk Scoring (visibility layer)**

4. **Capture Radar Risk Score**
   - On `charge.succeeded` webhook, extract `outcome.risk_score` and `outcome.risk_level` from the charge object
   - Store in a new `payment_risk_scores` table or as metadata on existing payment records
   - Surface high-risk payments (score > 65) as a filterable list in Payment Ops

5. **Risk Score Alerts**
   - When a payment completes with `risk_level: "elevated"` or `"highest"`, create a notification for the org

### Technical Details

**Database migrations:**
- Add `evidence_submitted_at` (timestamptz, nullable) to `payment_disputes`
- New `fraud_warnings` table with RLS scoped to `organization_id`
- New `payment_risk_scores` table (or add columns to existing payment tracking)

**Edge functions:**
- `submit-dispute-evidence` — calls `stripe.disputes.update()` with evidence fields and `submit: true`
- Extend `stripe-webhook/index.ts` with `radar.early_fraud_warning.created` and risk score capture on `charge.succeeded`

**Files to create/modify:**
- `supabase/functions/submit-dispute-evidence/index.ts` — new
- `supabase/functions/stripe-webhook/index.ts` — extend with 2 new event handlers
- `src/pages/dashboard/admin/PaymentOps.tsx` — add Evidence Submission dialog, Fraud Alerts section, Dispute Analytics cards
- `src/hooks/useDisputeEvidence.ts` — new mutation hook
- `src/hooks/useFraudWarnings.ts` — new query hook

**Scope:** Phase 1 first (evidence submission + early warnings + analytics). Phase 2 (Radar scoring) as a follow-up.

