

## Phase 2: Radar Risk Scoring

### What We're Building
Capture Stripe Radar risk scores from successful charges and surface high-risk payments in Payment Ops for proactive review.

### Database

**New table: `payment_risk_scores`**
- `id` (uuid, PK)
- `organization_id` (uuid, FK → organizations, NOT NULL)
- `stripe_charge_id` (text, unique, NOT NULL)
- `stripe_payment_intent_id` (text)
- `risk_score` (integer, 0-100)
- `risk_level` (text — `normal`, `elevated`, `highest`)
- `appointment_id` (uuid, nullable FK → appointments)
- `amount` (integer — cents)
- `currency` (text)
- `metadata` (jsonb — full Radar outcome blob)
- `created_at` (timestamptz)

RLS: `is_org_member(auth.uid(), organization_id)` for SELECT. No INSERT/UPDATE/DELETE from client — writes are webhook-only via service-role.

### Webhook Extension

**File: `supabase/functions/stripe-webhook/index.ts`**

1. Add `charge.succeeded` case to the switch (Connect events only — `isConnectEvent`)
2. New handler `handleChargeSucceeded`:
   - Extract `outcome.risk_score`, `outcome.risk_level` from the charge object
   - Resolve `organization_id` from the Connect account (same pattern as `handleDisputeCreated`)
   - Extract `payment_intent` and `metadata.appointment_id` if present
   - Insert into `payment_risk_scores`
   - If `risk_level` is `elevated` or `highest`, create a platform notification via the existing notification helper

### Frontend: High-Risk Payments Tab

**File: `src/pages/dashboard/admin/PaymentOps.tsx`**

1. New query hook `useHighRiskPayments(orgId)` — fetches from `payment_risk_scores` where `risk_level` in (`elevated`, `highest`), ordered by `created_at` desc, limit 100
2. New `HighRiskPaymentsCard` component inside Payment Ops:
   - Table with columns: Date, Charge ID, Amount, Risk Score (color-coded badge: green ≤ 30, yellow 31-64, orange 65-79, red 80+), Risk Level, Appointment link
   - Pagination via `usePaginatedSort`
   - `MetricInfoTooltip` explaining Radar scoring
3. Add a tab or section to the existing Disputes tab area (grouped with Fraud Alerts)

### New Files
- `src/hooks/useHighRiskPayments.ts` — query hook

### Modified Files
- `supabase/functions/stripe-webhook/index.ts` — add `charge.succeeded` handler
- `src/pages/dashboard/admin/PaymentOps.tsx` — add `HighRiskPaymentsCard` section
- 1 new migration for `payment_risk_scores` table

### Technical Details
- Risk score comes from `charge.outcome.risk_score` (integer 0-100) and `charge.outcome.risk_level` (`normal` | `elevated` | `highest`)
- Connect account → org resolution reuses the existing `zura_pay_connections` lookup pattern already in the webhook
- Notification threshold: `risk_level !== 'normal'` (covers both `elevated` and `highest`)
- The `charge.succeeded` event fires for every successful charge including terminal and card-on-file — the handler captures all of them

