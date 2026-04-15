

## Afterpay Audit Pass 7 — Webhook Re-Introduces Split Field Bug

One remaining P0 issue found.

---

### B1. `handleCheckoutCompleted` Always Writes `split_payment_link_intent_id` for ALL Link Payments (Bug — P0)

Line 338-339 of `stripe-webhook/index.ts`:

```text
const updatePayload: Record<string, unknown> = {
  split_payment_link_intent_id: paymentIntentId,
};
```

This unconditionally writes `split_payment_link_intent_id` for every checkout completion — even non-split payments. This **undoes** the Pass 6 fix in `create-checkout-payment-link` which conditionally writes the field only when `isSplit` is true.

**Scenario:**
1. Staff sends a non-split $500 link. `create-checkout-payment-link` correctly omits `split_payment_link_intent_id`.
2. Client pays the link. Webhook fires `handleCheckoutCompleted`.
3. Line 339 writes `split_payment_link_intent_id` anyway.
4. Payment is already marked `paid` (line 366-369), so no immediate harm.
5. But if staff later attempts a refund-and-re-collect via terminal for the same appointment, the terminal handler sees `split_payment_link_intent_id` exists and sets `partially_paid` instead of `paid`.

The field should only be written when the checkout is actually a split.

**Fix:** Move `split_payment_link_intent_id` into the split branch only:

```text
const updatePayload: Record<string, unknown> = {};

// Persist surcharge amount from checkout metadata
if (metadata.surcharge_amount_cents) {
  updatePayload.afterpay_surcharge_amount = parseInt(metadata.surcharge_amount_cents, 10);
}

const isSplit = metadata.is_split === 'true';

if (isSplit) {
  updatePayload.split_payment_link_intent_id = paymentIntentId;
  if (appt?.payment_status === 'partially_paid' && appt?.split_payment_terminal_intent_id) {
    updatePayload.payment_status = 'paid';
    updatePayload.paid_at = new Date().toISOString();
    updatePayload.payment_method = 'split_payment';
    updatePayload.stripe_payment_intent_id = paymentIntentId;
  } else {
    updatePayload.payment_status = 'partially_paid';
    updatePayload.payment_method = 'payment_link';
    updatePayload.stripe_payment_intent_id = paymentIntentId;
  }
} else {
  updatePayload.payment_status = 'paid';
  updatePayload.payment_method = 'payment_link';
  updatePayload.stripe_payment_intent_id = paymentIntentId;
  updatePayload.paid_at = new Date().toISOString();
}
```

---

### Implementation Summary

| Priority | ID | File | Change |
|----------|----|------|--------|
| P0 | B1 | `stripe-webhook/index.ts` | Only write `split_payment_link_intent_id` in `handleCheckoutCompleted` when `isSplit` is true |

No database migrations required. Single file change.

