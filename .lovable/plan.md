

# Zura Pay Ship Readiness — Gaps & Improvements

## What's Already Solid
The core payment infrastructure is well-built: Connect onboarding, terminal PI creation, card-on-file management, webhook handling for payment/setup/refund events, deposit holds, reconciliation, fee collection, branded S710 display, hardware ordering, and the Payment Ops tabbed UI with cross-linking. Security hardening (auth, membership checks, idempotency, CORS) was just completed.

---

## Missing Pieces (Ranked by Impact)

### 1. No `account.updated` Webhook Handler (Critical)
**Problem**: When a Connected Account's status changes (e.g., Stripe disables charges due to compliance, or onboarding completes asynchronously), there is no webhook handler to update `stripe_connect_status`. The only way status syncs today is via the manual "Verify" button. An org could lose the ability to process payments and Zura would never know.

**Fix**: Add `account.updated` case to `stripe-webhook/index.ts`. On receipt, read `charges_enabled` / `payouts_enabled` / `details_submitted` from the account object and update `organizations.stripe_connect_status` accordingly. Fire a platform alert if status degrades.

---

### 2. No Dispute/Chargeback Handling (Critical)
**Problem**: The webhook handles `charge.refunded` but does NOT handle `charge.dispute.created`, `charge.dispute.closed`, or `charge.dispute.funds_withdrawn`. Disputes are the highest-severity financial event a salon can face — they lose the funds immediately plus a $15 fee. Zura has zero visibility into this today.

**Fix**: 
- Add webhook handlers for `charge.dispute.created` and `charge.dispute.closed`
- Create a `payment_disputes` table to track dispute lifecycle
- Surface disputes in Payment Ops (new "Disputes" tab or badge on existing tab)
- Fire a real-time alert to org admins and platform

---

### 3. No Client-Facing Payment Receipts (High)
**Problem**: After a terminal checkout or card-on-file charge, no receipt is sent to the client. Stripe can auto-send receipts if `receipt_email` is set on the PaymentIntent, but `create-terminal-payment-intent` doesn't set it, and `charge-card-on-file` doesn't either.

**Fix**: 
- Pass `receipt_email` on PaymentIntents when client email is available
- Alternatively, use Stripe's `receipt_url` from the succeeded PI to surface a "Send Receipt" action in the appointment detail sheet

---

### 4. No Payout Schedule Configuration (Medium)
**Problem**: Orgs have no ability to view or change their payout schedule (daily, weekly, monthly). The `zura-pay-payouts` function reads balance and payout history but doesn't expose schedule settings. Salon owners care deeply about cash flow timing.

**Fix**: Add a read/update payout schedule action to the `zura-pay-payouts` edge function, surface it in the Payouts tab of Payment Ops or in the Zura Pay Configurator settings.

---

### 5. No Guided Activation Flow (Medium)
**Problem**: There's no progressive onboarding checklist for Zura Pay. An org owner lands on the Configurator tab and has to figure out the sequence: Create account → Complete verification → Connect locations → Register readers → Test checkout. The "Not Active" empty state exists but doesn't guide through multi-step activation.

**Fix**: Add a `ZuraPayActivationChecklist` component to the Configurator that tracks completion of each step with visual progress (checkmark/pending states). Steps: Account Created → Verification Complete → Location Connected → Reader Paired → First Transaction.

---

### 6. Platform Health Page Still Says "Stripe" (Low — Brand)
**Problem**: `StripeHealth.tsx` header says "Monitor Stripe payment processing" and the page/route is named `stripe-health`. This violates brand isolation.

**Fix**: Rename route to `payments-health`, rename component references, update all copy to "Zura Pay" terminology.

---

## Improvements (Nice-to-Have)

| Improvement | Description |
|---|---|
| **Partial refunds** | `process-stripe-refund` may only support full refunds — add partial refund amount input |
| **Retry failed charges** | The dock shows a retry button for failed card-on-file charges, but verify the edge function supports idempotent retry |
| **Transaction search** | Payment Ops has no search/filter across all Zura Pay transactions for an org — useful for support |
| **Payout reconciliation** | Link individual payouts to the transactions they contain (Stripe provides this via `balance_transaction` expansion) |
| **Multi-currency prep** | All amounts hardcode `usd` — add currency from org settings for future international expansion |

---

## Recommended Priority Order

1. `account.updated` webhook handler (prevents silent payment outages)
2. Dispute handling (financial risk mitigation)
3. Client receipts (client experience baseline)
4. Brand cleanup on Platform Health page
5. Guided activation checklist
6. Payout schedule configuration

---

## Technical Scope

| File | Change |
|---|---|
| `supabase/functions/stripe-webhook/index.ts` | Add `account.updated`, `charge.dispute.created`, `charge.dispute.closed` handlers |
| New migration | Create `payment_disputes` table |
| `src/pages/dashboard/admin/PaymentOps.tsx` | Add Disputes tab/badge |
| `supabase/functions/create-terminal-payment-intent/index.ts` | Add `receipt_email` |
| `supabase/functions/charge-card-on-file/index.ts` | Add `receipt_email` |
| `src/pages/dashboard/platform/StripeHealth.tsx` | Rebrand to Zura Pay |
| `src/App.tsx` | Update route from `stripe-health` to `payments-health` |
| `supabase/functions/zura-pay-payouts/index.ts` | Add payout schedule read/update |
| New component | `ZuraPayActivationChecklist` for Configurator |

No new secrets. No new dependencies. Migrations only for `payment_disputes` table.

