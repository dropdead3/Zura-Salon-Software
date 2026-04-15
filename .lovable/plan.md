

## Afterpay Audit Pass 3 — Remaining Bugs, Gaps & Enhancements

Five issues remain after reviewing all Afterpay-touching surfaces.

---

### B1. SplitPaymentDialog Doesn't Pass `original_amount_cents` — Split Detection Fails (Bug — P0)

`SplitPaymentDialog.tsx` line 83 sends `amount_cents: afterpayAmountCents` to `create-checkout-payment-link` but never passes `original_amount_cents`. The edge function computes `is_split` as `amount_cents < (body.original_amount_cents || amount_cents)` — without `original_amount_cents`, this evaluates to `false`. The webhook then treats split payments as non-split, marking the appointment `paid` on the link leg alone. The terminal leg becomes orphaned.

**Fix:** Add `original_amount_cents: totalAmountCents` to the body in `SplitPaymentDialog.tsx` line 83, matching what `SendToPayButton` already does.

---

### B2. Terminal Webhook Overwrites `partially_paid` to `paid` (Bug — P0)

`handlePaymentIntentSucceeded` (line 648) unconditionally sets `payment_status: 'paid'` and only guards with `.neq('payment_status', 'paid')`. When the link leg completes first and sets `partially_paid`, the terminal webhook fires and correctly marks `paid`. But if the terminal fires first (before the link), it marks `paid` immediately — the subsequent checkout webhook then re-fires and overwrites `paid_at`. More critically, there's no awareness of split context in the terminal handler at all.

**Fix:** In `handlePaymentIntentSucceeded`, when the appointment has a `split_payment_link_intent_id` set (meaning a link was created) but `split_payment_link_intent_id` has no corresponding checkout completion, set `partially_paid` instead of `paid`. Query the appointment's `split_payment_link_intent_id` and `payment_status` before deciding.

---

### B3. `GroupedTransactionTable` Quick-Print Omits Surcharge (Bug — P1)

`GroupedTransactionTable.tsx` line 90 calls `printReceipt(txn, ...)` without passing the 7th parameter `afterpaySurchargeAmount`. The surcharge line item won't appear on receipts printed from the transaction table's dropdown menu.

**Fix:** Pass `undefined, txn.afterpaySurchargeAmount` as the 6th and 7th arguments.

---

### G1. Booking Badge Hidden Entirely When Surcharge Enabled (Gap — P1)

`BookingConfirmation.tsx` line 181 has `!(afterpaySurchargeRate != null && afterpaySurchargeRate > 0)` which hides the Afterpay badge completely when surcharges are enabled. Since we already exclude Afterpay from booking deposits when surcharges are on (B1 from previous pass), hiding the badge is correct behavior. However, clients see no explanation of why Afterpay isn't available during booking but appears later via Send-to-Pay. Consider showing a muted note like "Afterpay available at checkout via payment link."

**Fix (optional enhancement):** Replace the hidden badge with a subtle text note when surcharges are enabled, explaining Afterpay is available via payment link after the appointment.

---

### E1. Surcharge Preview in Settings Uses Integer `ratePercent` for Comparison (Enhancement — P2)

`ZuraPayAfterpayTab.tsx` line 70: `if (num === ratePercent) return;` — `ratePercent` is `Math.round(surchargeRate * 100)` which loses precision. A rate of `0.065` (6.5%) rounds to `7`, so entering `6.5` would always trigger a mutation since `6.5 !== 7`. The guard is ineffective for fractional rates.

**Fix:** Compare against `surchargeRate * 100` without rounding instead of `ratePercent`.

---

### Implementation Summary

| Priority | ID | File(s) | Change |
|----------|----|---------|--------|
| P0 | B1 | `SplitPaymentDialog.tsx` | Add `original_amount_cents: totalAmountCents` to edge function call body |
| P0 | B2 | `stripe-webhook/index.ts` | Query split context in `handlePaymentIntentSucceeded`; set `partially_paid` when link leg is pending |
| P1 | B3 | `GroupedTransactionTable.tsx` | Pass `txn.afterpaySurchargeAmount` to `printReceipt` |
| P1 | G1 | `BookingConfirmation.tsx` | Optionally show "Afterpay available via payment link" note when surcharge hides the badge |
| P2 | E1 | `ZuraPayAfterpayTab.tsx` | Fix rate comparison to use unrounded value |

No database migrations required. All changes are code-level.

