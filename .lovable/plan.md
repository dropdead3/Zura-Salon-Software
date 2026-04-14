

## Afterpay Audit Pass — Remaining Bugs, Gaps & Enhancements

After reviewing all Afterpay-touching files, here are the remaining issues.

---

### B1. Booking Deposit Intent Ignores Surcharge (Bug — P0)

`create-booking-payment-intent/index.ts` queries `afterpay_enabled` but never fetches `afterpay_surcharge_enabled` or `afterpay_surcharge_rate`. When surcharge is enabled, the booking deposit flow still offers both card and Afterpay with no surcharge line item. The client avoids the fee by booking online instead of using a Send-to-Pay link — inconsistent pricing.

**Fix:** Fetch surcharge columns. When surcharge is enabled and the deposit is Afterpay-eligible, either restrict to Afterpay-only with a surcharge line item (matching the Send-to-Pay behavior), or keep card+Afterpay but disclose the fee will apply if Afterpay is selected. The simpler approach: since booking deposits use PaymentIntents (not Checkout Sessions), and PaymentIntents can't add conditional line items per method, the correct fix is to add a note in the `AfterpayPromoBadge` that a fee applies — and accept that the surcharge only enforces on Checkout Session flows (Send-to-Pay). Document this limitation clearly.

**Practical fix:** In `create-booking-payment-intent`, when surcharge is enabled, exclude `afterpay_clearpay` from `payment_method_types` so deposits are card-only. The booking badge already shows the surcharge note — but if Afterpay isn't offered, hide the badge. This keeps pricing consistent: surcharge = Afterpay via Send-to-Pay only, not booking deposits.

---

### B2. Split Payment Webhook Logic — Terminal-Then-Link Race (Bug — P1)

In `handleCheckoutCompleted` (line 348-358), the logic checks `appt.split_payment_terminal_intent_id` to decide if terminal was already paid. But if the client clicks the Afterpay link *before* the staff processes the terminal payment, the webhook marks the appointment as `paid` with only the link leg completed. The terminal payment then has no effect on status.

**Fix:** Don't set `payment_status = 'paid'` when `split_payment_terminal_intent_id` is null *and* the original amount exceeds $4,000. Check if this was a split-originated session by adding `is_split: "true"` to the checkout metadata in `create-checkout-payment-link`, then only mark paid when both legs are confirmed.

---

### G1. Receipt Doesn't Include Surcharge Line Item (Gap — P1)

`receiptData.ts` has a `surcharge` category defined but neither `checkoutToReceiptData` nor `groupedTransactionToReceiptData` ever produces a surcharge line item. When a payment link with surcharge is completed, the receipt shows only the base amount — the fee is invisible.

**Fix:** When building receipt data for a payment-link transaction, check `afterpay_surcharge_amount` on the appointment and add a `{ name: 'Afterpay Processing Fee', amount: surchargeAmount, quantity: 1, category: 'surcharge' }` line item.

---

### G2. No Reporting Surface for Surcharge Revenue (Gap — P2)

The `afterpay_surcharge_amount` column now exists on `appointments`, but no dashboard view, export, or analytics surface exposes it. Staff can't see how much surcharge revenue has been collected.

**Fix:** Add surcharge amount to the transaction detail sheet and optionally to the revenue analytics queries. This is a lower-priority enhancement.

---

### E1. `handleRateChange` Fires on Every Blur Without Checking for Change (Enhancement — P2)

In `ZuraPayAfterpayTab.tsx`, `onBlur` always calls `handleRateChange` which triggers a mutation even if the value hasn't changed. This creates unnecessary database writes.

**Fix:** Compare `localRate` against current `ratePercent` before calling the mutation.

---

### Implementation Summary

| Priority | ID | File(s) | Change |
|----------|----|---------|--------|
| P0 | B1 | `create-booking-payment-intent/index.ts`, `BookingConfirmation.tsx` | Exclude Afterpay from deposits when surcharge enabled; hide badge accordingly |
| P1 | B2 | `create-checkout-payment-link/index.ts`, `stripe-webhook/index.ts` | Add `is_split` metadata flag; fix paid-status logic for split payments |
| P1 | G1 | `receiptData.ts`, `CheckoutSummarySheet.tsx` | Add surcharge line item to receipt when `afterpay_surcharge_amount` is present |
| P2 | G2 | Transaction detail / analytics surfaces | Surface surcharge column in reporting |
| P2 | E1 | `ZuraPayAfterpayTab.tsx` | Guard `onBlur` mutation with value-changed check |

No database migrations required. All fixes are code-level.

