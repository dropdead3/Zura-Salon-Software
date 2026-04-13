

# Zura Pay POS — Tenth-Pass Audit

## Status of Previous Fixes

The Ninth-Pass fixes (G1 webhook handlers, G2 refund integration, G4 atomic updates, G5 tip on reader display) are all properly implemented. The Operations Hub migration (PaymentOps page, TeamHub card, TillBalanceSummary navigation) is clean. Good structural progress.

## Remaining Bugs

### B1: No `transactions` table insert for terminal card payments (G3 — still open)
**Severity: High — card payments are invisible in the Transactions hub and all financial reports.**

`handleCheckoutConfirm` in `Schedule.tsx` updates the `appointments` table but never inserts a row into `transactions`. The Transactions tab, till balance summary, and all sales reports query the `transactions` table. Terminal card payments are therefore completely absent from financial reporting.

**Fix:** After the appointment update succeeds in `handleCheckoutConfirm`, insert a `transactions` row with `type: 'service'`, the appointment ID, client ID, total amount, payment method (`card_reader`), and the PI ID. Alternatively, do this server-side in the `payment_intent.succeeded` webhook handler for reliability.

### B2: Reconciliation queries appointments without `organization_id` filter
**Severity: Medium — cross-tenant data leakage risk.**

In `reconcile-till/index.ts` line 108-112, the local appointments query filters by `appointment_date` and `stripe_payment_intent_id IS NOT NULL` but does **not** filter by `organization_id`. This means the reconciliation could match appointments from other organizations if they happen to share a date.

**Fix:** Add `.eq("organization_id", organization_id)` to the appointments query in the `reconcile_daily` action.

### B3: `PaymentOps` refund "Process" button doesn't pass `payment_intent_id` or `amount`
**Severity: Medium — refund processing will fail.**

`handleProcessRefund` sends `{ refund_record_id, organization_id }` to the edge function, but `process-stripe-refund` requires `payment_intent_id`, `amount`, `organization_id`, and `refund_record_id`. The PI ID and amount are not fetched from the refund record before calling.

**Fix:** Either fetch the full refund record (with its linked transaction's PI ID and amount) before invoking the edge function, or modify the edge function to look up the PI ID from the refund record itself.

### B4: `as any` cast on `AppointmentDetailSheet.tsx` for deposit fields
**Severity: Low — type safety gap.**

Line 1216 casts `(appointment as any).deposit_amount`. These fields should be on the appointment type by now.

## Gaps

### G1: No entry point to collect deposits via terminal
The `useTerminalDeposit.collectDeposit` hook exists and the edge function supports `collect_deposit`, but there is no UI button to initiate deposit collection. The booking flow and appointment detail sheet don't surface a "Collect Deposit" action for appointments with `require_deposit = true`.

**Fix:** Add a "Collect Deposit" button in `AppointmentDetailSheet` when the appointment has `require_deposit = true` and `deposit_status` is null/undefined. This button should invoke `collectDeposit` with the active reader.

### G2: Deposit hold expiration not handled
Stripe pre-auth holds expire after ~7 days (card-present). If an appointment is booked more than 7 days out, the hold will expire silently. There's no mechanism to detect or re-collect expired holds.

**Fix (lightweight):** Add a note in the PaymentOps deposit holds section warning about hold expiration windows. For a more robust solution, add a scheduled check or webhook for `payment_intent.canceled` (auto-expired) that updates `deposit_status = 'expired'`.

### G3: Webhook doesn't distinguish platform vs Connect events
The `payment_intent.succeeded` handler runs for all PI events — including platform subscription payments. If a platform subscription PI has no `appointment_id` metadata, it returns early (correct), but this is fragile. Consider checking `event.account` to determine if the event is from a Connected Account.

## Enhancements

### E1: Confirmation dialogs for destructive actions
The Capture/Release deposit buttons and Process Refund button execute immediately on click with no confirmation. These are irreversible financial operations that should require explicit confirmation.

### E2: Optimistic badge count on Operations Hub card
The TeamHub "Payment Operations" card has no live stat badge. Adding a lightweight count of `pending refunds + active holds` would give operators a reason to click through.

---

## Immediate Changes

| File | Change |
|------|--------|
| `supabase/functions/reconcile-till/index.ts` | Add `.eq("organization_id", organization_id)` to reconcile_daily appointments query (B2) |
| `src/pages/dashboard/Schedule.tsx` | Insert `transactions` row after successful checkout for card payments (B1) |
| `src/pages/dashboard/admin/PaymentOps.tsx` | Fix `handleProcessRefund` to fetch PI ID and amount from refund record before calling edge function (B3); add confirmation dialogs for Capture/Release/Process (E1) |
| `src/pages/dashboard/admin/TeamHub.tsx` | Add stat badge to Payment Operations card showing pending refund + hold count (E2) |
| `supabase/functions/stripe-webhook/index.ts` | Add `event.account` check to distinguish Connect vs platform events (G3) |

0 migrations, 0 new edge functions, 0 new dependencies.

