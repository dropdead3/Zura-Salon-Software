

# Zura Pay POS — Ship-Readiness Audit

## What's Working

The core terminal checkout flow is solid: PI creation on Connected Accounts, server-driven reader display, payment polling with PI verification fallback, webhook handlers for `payment_intent.succeeded/failed`, till reconciliation against Stripe, deposit hold/capture/release, refund processing, and the Operations Hub consolidation. Good structural progress.

## Remaining Bugs

### B1: Refund "Process" still broken — `payment_intent_id` never reaches the edge function
**Severity: High — refunds will fail 100% of the time.**

`PaymentOps.tsx` passes `original_transaction_id` and `amount` to `process-stripe-refund`, but that edge function requires `payment_intent_id` (line 68). Nobody resolves the transaction ID into a PI ID. The edge function doesn't look it up, and the client doesn't fetch it.

**Fix:** Modify `process-stripe-refund` to accept `original_transaction_id` as an alternative, look up the `stripe_payment_intent_id` from `phorest_sales_transactions` (or `appointments`), and use that for the Stripe refund call. This is more reliable than having the client fetch and pass it.

### B2: `refund_amount` sent in dollars but edge function expects cents
**Severity: High — refunds will be 100x smaller than intended.**

`refund_records.refund_amount` is stored in dollars (matching display values). The edge function passes `amount` directly to `stripe.refunds.create()`, which expects cents. The conversion (`* 100`) is missing.

**Fix:** Add `Math.round(amount * 100)` conversion in the edge function before calling Stripe, or document and enforce cent storage in `refund_records`.

### B3: `as any` casts for deposit fields in `AppointmentDetailSheet`
**Severity: Low — type safety gap, no runtime impact.**

Lines 1212-1230 use `(appointment as any).deposit_status` and `deposit_amount`. These fields exist on the `appointments` table but the component's local type doesn't include them.

**Fix:** Extend the appointment type/interface used in `AppointmentDetailSheet` to include `deposit_required`, `deposit_amount`, `deposit_status`, and `deposit_stripe_payment_id`.

## Gaps

### G1: No UI to collect deposits via terminal
**Impact: High — the deposit flow is dead-ended.**

`useTerminalDeposit.collectDeposit` exists, the edge function handles `collect_deposit`, but there is zero UI to trigger it. The `AppointmentDetailSheet` shows deposit status but has no "Collect Deposit" button.

**Fix:** Add a "Collect Deposit" button in `AppointmentDetailSheet` when `deposit_required === true` and `deposit_status` is null/undefined. Wire it to `collectDeposit` using the active reader from `useActiveTerminalReader`.

### G2: Auto-capture at checkout doesn't verify PI status before capturing
**Impact: Medium — capturing an expired hold will throw an unhandled Stripe error.**

`CheckoutSummarySheet` calls `captureDeposit` during checkout, but doesn't check whether the hold is still valid. Card-present pre-auth holds expire after ~7 days. If the appointment is more than 7 days out, the capture will fail with a Stripe error and the checkout will break.

**Fix:** Wrap the `captureDeposit` call in a try/catch with a graceful fallback (toast warning that deposit expired, proceed with full charge). Optionally add `payment_intent.canceled` to the webhook handler to auto-update `deposit_status = 'expired'`.

### G3: Webhook doesn't handle `charge.refunded` events
**Impact: Medium — refunds initiated outside Zura (e.g. Stripe Dashboard) won't update local records.**

If someone issues a refund directly in Stripe, the local `refund_records` and appointment status won't reflect it. This creates reconciliation discrepancies.

**Fix:** Add a `charge.refunded` handler in `stripe-webhook` that looks up the appointment by PI ID and updates the refund status.

### G4: No Stripe Connect webhook endpoint registration
**Impact: Critical for production — none of the terminal webhook handlers will fire.**

The `stripe-webhook` edge function handles Connect events (checking `event.account`), but there's no documented or automated step to register this endpoint URL in the Stripe Dashboard as a Connect webhook listener. Without this, Stripe never sends events to the endpoint.

**Fix:** This is a deployment/ops task, not a code change. Document the webhook URL (`https://<project-ref>.supabase.co/functions/v1/stripe-webhook`) and the required events (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`) in a setup guide. Consider adding a "Webhook Status" indicator in Zura Pay Configurator settings.

### G5: `TeamHub` badge query missing `organization_id` filter
**Impact: Medium — badge count includes data from all organizations.**

The pending refunds and active holds queries in `TeamHub.tsx` (lines 256-264) don't filter by `organization_id`, so the badge count is cross-tenant.

**Fix:** Add `.eq('organization_id', orgId)` to both queries.

## Enhancements

### E1: Reconciliation should show local totals alongside Stripe totals
Currently the reconciliation result shows Stripe totals and "matched count" but not the local dollar total. Operators can't compare amounts without doing mental math.

### E2: Transaction record should include `organization_id`
The B1 fix in `Schedule.tsx` inserts into `phorest_sales_transactions` but doesn't include `organization_id`, which will cause RLS issues if the table has org-scoped policies.

---

## Changes

| Priority | File | Change |
|----------|------|--------|
| **Critical** | `supabase/functions/process-stripe-refund/index.ts` | Accept `original_transaction_id` as alternative; look up PI ID from transactions/appointments; convert amount to cents (B1, B2) |
| **Critical** | `src/pages/dashboard/admin/TeamHub.tsx` | Add `organization_id` filter to badge queries (G5) |
| **High** | `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Add "Collect Deposit" button for appointments with `deposit_required` and no held deposit (G1); fix `as any` casts (B3) |
| **High** | `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` | Wrap `captureDeposit` in try/catch with expired-hold fallback (G2) |
| **High** | `src/pages/dashboard/Schedule.tsx` | Add `organization_id` to transaction insert (E2) |
| **Medium** | `supabase/functions/stripe-webhook/index.ts` | Add `charge.refunded` handler (G3) |
| **Low** | `src/pages/dashboard/admin/PaymentOps.tsx` | Add local totals to reconciliation results display (E1) |

1 edge function update, 0 migrations, 0 new dependencies.

