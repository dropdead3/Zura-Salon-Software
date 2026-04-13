

# Zura Pay POS — Ninth-Pass Audit

Good instinct asking this. There are several important gaps remaining that would prevent this from being a truly production-ready POS system.

## Critical Gaps

### G1: No webhook handler for terminal `payment_intent.succeeded` events
**Impact: High — payment state can become permanently stale.**

The `stripe-webhook` function handles `checkout.session.completed`, `invoice.*`, and `charge.failed` — but has zero handlers for `payment_intent.succeeded` or `payment_intent.payment_failed`. Terminal card-present payments generate these events on the Connected Account.

Right now, the *only* way a terminal payment gets recorded is through the client-side poll → PI verify → `onConfirm` flow. If the front desk closes the browser tab mid-payment, or the poll times out but the payment actually succeeds seconds later, the appointment stays incomplete and the PI ID is never stored. A webhook would act as the safety net.

**Fix:** Add `payment_intent.succeeded` and `payment_intent.payment_failed` handlers to the webhook (or create a dedicated Connect webhook endpoint). On `succeeded`, look up the appointment via `metadata.appointment_id`, update `payment_status = 'paid'` and store the PI ID. This makes the system eventually consistent regardless of client-side behavior.

### G2: Refunds don't touch Stripe — only local records
**Impact: High — "Refund to Original Payment" is a lie for card-reader payments.**

`useProcessRefund` creates a `refund_records` row and sets status to `pending` for `original_payment` type. But it never calls `stripe.refunds.create()`. For cash payments this is fine (manual), but for card-reader payments with a `stripe_payment_intent_id`, the refund should actually be issued through Stripe.

**Fix:** Create a `process-stripe-refund` edge function that accepts a PI ID and amount, calls `stripe.refunds.create()` on the Connected Account, then updates `refund_records.status` to `completed`. Wire `useProcessRefund` to call this when `refund_type === 'original_payment'` and a `stripe_payment_intent_id` exists on the source transaction.

### G3: No transaction record created for terminal payments
**Impact: High — terminal payments don't appear in the Transactions hub.**

The checkout flow updates the `appointments` table with `payment_method` and `stripe_payment_intent_id`, but it never inserts a row into the `transactions` table. The Transactions hub, daily till reconciliation, and sales reports all query `transactions` — so card-reader payments are invisible to reporting.

**Fix:** After a successful terminal payment, insert a `transactions` row with type `service`, linking the appointment ID, client ID, amount, payment method (`card_present`), and PI ID. This can be done client-side in `handleCheckoutConfirm` or server-side via the webhook (preferred).

### G4: `handleStatusChange('completed')` runs *before* the payment metadata update
**Impact: Medium — race condition.**

In `Schedule.tsx` line 530, `handleStatusChange('completed', ...)` fires first, then lines 537-549 run a *separate* `.update()` for payment metadata. If `handleStatusChange` triggers a query invalidation, the UI may briefly show the appointment as "completed" with no payment info. Worse, if the second update fails silently (the `catch` just logs), the payment metadata is lost.

**Fix:** Merge both updates into a single `.update()` call, or ensure `handleStatusChange` accepts and persists payment metadata atomically.

## Moderate Gaps

### G5: Tip not included in reader display cart
The `set_reader_display` call pushes line items and tax to the reader screen, but tip is added *after* the cart display. The customer sees a total that doesn't include the tip they just agreed to in the app. This is confusing on the S710 display.

**Fix:** Add the tip as a line item (description: "Tip") in the `set_reader_display` payload so the reader screen total matches `grandTotal`.

### G6: No receipt for card payments
The receipt PDF doesn't include payment method or PI reference. For card payments, receipts should show "Paid by Card" and the last 4 digits (available from the PI's `charges.data[0].payment_method_details.card_present.last4`). Currently all receipts look the same regardless of payment method.

### G7: `as any` type assertion on payment update
`Schedule.tsx` line 545 uses `as any` to bypass TypeScript. Since the migration already added `stripe_payment_intent_id` and the types file includes it, this cast should be removable now.

## Enhancement Opportunities

### E1: Daily till reconciliation for card payments
The Transactions hub has a till balance feature, but it only tracks cash. Card-reader payments should be reconciled against Stripe's actual payout data to give owners a complete end-of-day picture.

### E2: Deposit collection via terminal
The booking surface already has `require_deposit` settings, but deposits are not collected through the terminal. Wiring the terminal checkout flow to deposit collection (pre-auth with capture later) would close this loop.

---

## Immediate Changes

| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Add `payment_intent.succeeded` and `payment_intent.payment_failed` handlers that update `appointments` (G1) |
| `supabase/functions/process-stripe-refund/index.ts` | **New** — calls `stripe.refunds.create()` on Connected Account for card payments (G2) |
| `src/hooks/useRefunds.ts` | When `refund_type === 'original_payment'` and source has a PI ID, call `process-stripe-refund` instead of just inserting a pending record (G2) |
| `src/pages/dashboard/Schedule.tsx` | Merge payment metadata into the `handleStatusChange` update call (G4); remove `as any` (G7); insert transaction record for card payments (G3) |
| `src/components/dashboard/schedule/CheckoutSummarySheet.tsx` | Include tip as a line item in `set_reader_display` payload (G5) |

1 new edge function, 0 migrations, 0 new dependencies.

