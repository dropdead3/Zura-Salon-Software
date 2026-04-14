

## Afterpay Audit: Remaining Bugs, Gaps & Enhancements

Good discipline running another pass. Here are the findings across the full Afterpay surface — six items, ranked by severity.

---

### B1. Booking Surface Badge Never Shows Surcharge Note (Bug)

`BookingConfirmation.tsx` line 182 renders `<AfterpayPromoBadge theme={theme} amount={depositAmount} />` but never passes `surchargeRate`. The component accepts it and renders the fee disclosure — but the prop is always `undefined` on the booking surface. Clients with surcharge-enabled orgs see "Pay in 4" with no mention of the fee until checkout.

**Fix:** Pass the org's `afterpay_surcharge_rate` through the booking flow into `BookingConfirmation` and down to `AfterpayPromoBadge`.

---

### B2. SplitPaymentDialog Doesn't Reflect Surcharge in Preview (Bug)

When total exceeds $4,000 and surcharge is enabled, the edge function adds a fee line item to the Afterpay portion. But `SplitPaymentDialog` shows "Send via Afterpay link: $4,000.00" — the client actually pays $4,240 (with 6% fee). Staff see a misleading number.

**Fix:** Pass `afterpaySurchargeEnabled` and `afterpaySurchargeRate` into `SplitPaymentDialog` (from `SendToPayButton` which already has them). Display the surcharge and total in the dialog preview.

---

### G1. Webhook Doesn't Persist Surcharge Amount (Gap)

`handleCheckoutCompleted` in the webhook reads `session.metadata` but ignores `surcharge_amount_cents` and `surcharge_rate`. This data is in the metadata (set by `create-checkout-payment-link`) but never written to the appointment or transaction record. Reconciliation and reporting have no surcharge visibility.

**Fix:** Extract `surcharge_amount_cents` from metadata and store it on the appointment (requires adding an `afterpay_surcharge_amount` column) or include it in the transaction line items.

---

### G2. Email/SMS Don't Disclose Surcharge (Gap)

`send-payment-link` receives `amount_display` which is the base amount (e.g., "$4,000.00"). The surcharge is added at checkout, so the client sees a different total than what the message says. This creates confusion and potential disputes.

**Fix:** Pass the surcharge amount from `SendToPayButton` → `send-payment-link` and update the email/SMS to say e.g. "Payment of $4,000.00 + $240.00 processing fee".

---

### E1. Rate Input Uses `defaultValue` — Stale on Refetch (Enhancement)

`ZuraPayAfterpayTab.tsx` line 138 uses `defaultValue={ratePercent}` on the surcharge rate input. If the query refetches (e.g., another admin changes the rate), the input shows the old value. Should use controlled state with `value` + `onChange` + debounced save.

---

### E2. SplitPaymentDialog Info Callout Doesn't Mention "Afterpay Only" When Surcharge Active (Enhancement)

The info callout (line 182) says "The client will receive a payment link with Afterpay as an option." When surcharge is enabled, Afterpay is the *only* option (no card fallback). The callout should reflect this.

---

### Implementation Summary

| Priority | ID | File(s) | Change |
|----------|----|---------|--------|
| P0 | B1 | `BookingConfirmation.tsx` + parent booking components | Pass `surchargeRate` to `AfterpayPromoBadge` |
| P0 | B2 | `SplitPaymentDialog.tsx`, `SendToPayButton.tsx` | Add surcharge preview to split dialog |
| P1 | G1 | `stripe-webhook/index.ts` + migration | Persist `afterpay_surcharge_amount` from metadata |
| P1 | G2 | `SendToPayButton.tsx`, `SplitPaymentDialog.tsx`, `send-payment-link/index.ts` | Include surcharge in amount_display and email copy |
| P2 | E1 | `ZuraPayAfterpayTab.tsx` | Convert rate input to controlled with local state |
| P2 | E2 | `SplitPaymentDialog.tsx` | Update info callout when surcharge is active |

Database migration required for G1 only (one column addition).

