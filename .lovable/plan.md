

## Afterpay Audit Pass 4 — Critical Split Payment Bug + Minor Issues

### B1. Split Payment Stuck at `partially_paid` Forever (Bug — P0)

When the terminal leg fires **before** the link leg:

1. Terminal handler (line 656) sees `split_payment_link_intent_id` exists, sets `partially_paid`. Does **not** set `paid_at` (line 668: `paid_at` is undefined when `resolvedStatus !== 'paid'`, and undefined keys are deleted).
2. Link handler (line 352) checks `appt?.paid_at && appt?.split_payment_terminal_intent_id` to decide if the terminal already paid. But `paid_at` is null — so the condition fails.
3. Link handler falls to else (line 356) and sets `partially_paid` **again**.
4. Appointment is stuck at `partially_paid` permanently. No path ever reaches `paid`.

The reverse order (link-then-terminal) works because the terminal handler checks `payment_status !== 'partially_paid'` which correctly detects the link completion.

**Fix:** In `handleCheckoutCompleted` line 352, replace `appt?.paid_at` with `appt?.payment_status === 'partially_paid'`. This correctly detects "terminal already fired" regardless of whether `paid_at` was set. Also add `paid_at` and `payment_method` to the update payload when marking the split as fully `paid`.

```text
Before (broken):
  if (appt?.paid_at && appt?.split_payment_terminal_intent_id) {
    updatePayload.payment_status = 'paid';
  }

After (fixed):
  if (appt?.payment_status === 'partially_paid' && appt?.split_payment_terminal_intent_id) {
    updatePayload.payment_status = 'paid';
    updatePayload.paid_at = new Date().toISOString();
    updatePayload.payment_method = 'split_payment';
    updatePayload.stripe_payment_intent_id = paymentIntentId;
  }
```

Also update the select query (line 329) to include `payment_status`:
```
.select('split_payment_terminal_intent_id, paid_at, organization_id, payment_status')
```

---

### B2. `localRate` Syncs with Rounded Value — Fractional Rates Lost in UI (Bug — P2)

`ZuraPayAfterpayTab.tsx` line 83: `setLocalRate(String(Math.round(surchargeRate * 100)))` rounds the display value. A rate of `0.065` (6.5%) displays as `7` in the input. The `handleRateChange` guard (line 70) now correctly compares against the raw value, but the **displayed value** is still wrong.

**Fix:** Remove `Math.round` from both line 77 and line 83. Use `String(surchargeRate * 100)` so the input displays `6.5` for a 6.5% rate.

---

### B3. Surcharge Preview Rounds Rate Display (Bug — P2)

`CheckoutSummarySheet.tsx` line 838 and `AfterpayPromoBadge.tsx` line 26 both use `Math.round(surchargeRate * 100)` which shows `7%` for a 6.5% rate. The Stripe line item description in `create-checkout-payment-link` line 139 has the same issue.

**Fix:** Use `parseFloat((surchargeRate * 100).toFixed(2))` for display so fractional rates render correctly.

---

### Implementation Summary

| Priority | ID | File(s) | Change |
|----------|----|---------|--------|
| P0 | B1 | `stripe-webhook/index.ts` | Fix split-payment completion check: use `payment_status` not `paid_at`; set `paid_at` on completion |
| P2 | B2 | `ZuraPayAfterpayTab.tsx` | Remove `Math.round` from `localRate` sync |
| P2 | B3 | `CheckoutSummarySheet.tsx`, `AfterpayPromoBadge.tsx`, `create-checkout-payment-link/index.ts` | Use precise rate display instead of `Math.round` |

No database migrations required.

