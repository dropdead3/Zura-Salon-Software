

## Afterpay Audit Pass 5 — Critical Split Payment Bug + Remaining Display Issue

Two issues remain. One is a P0 that will cause split payments to get stuck permanently.

---

### B1. Terminal Handler Never Writes `split_payment_terminal_intent_id` — Split Completion Impossible (Bug — P0)

The link handler in `handleCheckoutCompleted` (line 352) checks:
```
if (appt?.payment_status === 'partially_paid' && appt?.split_payment_terminal_intent_id)
```

But `split_payment_terminal_intent_id` is **never written by any code path**. The terminal handler (`handlePaymentIntentSucceeded`) writes `stripe_payment_intent_id` but not `split_payment_terminal_intent_id`. So when the terminal fires first:

1. Terminal detects split context (line 659), correctly sets `partially_paid`
2. Terminal writes `stripe_payment_intent_id` but NOT `split_payment_terminal_intent_id`
3. Link fires, sees `payment_status === 'partially_paid'` (true) but `split_payment_terminal_intent_id` is null (false)
4. Condition fails → falls to else → sets `partially_paid` again
5. Appointment stuck at `partially_paid` forever

**Fix:** In the terminal handler, when `resolvedStatus === 'partially_paid'` (split detected), add `split_payment_terminal_intent_id: piId` to the update payload. This allows the link handler to confirm both legs are done.

```text
// In handlePaymentIntentSucceeded, after resolvedStatus is determined:
if (resolvedStatus === 'partially_paid') {
  updatePayload.split_payment_terminal_intent_id = piId;
}
```

---

### B2. `SendToPayButton` Still Uses `Math.round` for Rate Display (Bug — P2)

Line 137: `` `Send to Pay (Afterpay + ${Math.round((afterpaySurchargeRate ?? 0.06) * 100)}% fee)` `` — missed in the Pass 4 precision fixes. A 6.5% rate shows as "7% fee".

**Fix:** Replace `Math.round(...)` with `parseFloat(((afterpaySurchargeRate ?? 0.06) * 100).toFixed(2))`.

---

### Implementation Summary

| Priority | ID | File | Change |
|----------|----|------|--------|
| P0 | B1 | `stripe-webhook/index.ts` | Write `split_payment_terminal_intent_id: piId` in terminal handler when split is detected |
| P2 | B2 | `SendToPayButton.tsx` | Use precise rate display instead of `Math.round` |

No database migrations required.

