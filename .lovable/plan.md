

## Afterpay Audit Pass 6 — Critical Field Misuse + Floating Point Guard

---

### B1. `split_payment_link_intent_id` Written for ALL Payment Links — Terminal Misidentifies Non-Split as Split (Bug — P0)

`create-checkout-payment-link/index.ts` line 176 **always** writes `split_payment_link_intent_id: session.id` regardless of whether the payment is a split. This means:

1. Staff sends a non-split $500 payment link (not a split — full amount via link)
2. `split_payment_link_intent_id` is set on the appointment
3. Client doesn't pay the link. Staff decides to collect via terminal instead
4. Terminal webhook fires → sees `split_payment_link_intent_id` exists → thinks it's a split → sets `partially_paid`
5. Appointment stuck at `partially_paid` forever — no second leg will ever fire

This field should only be written when the payment is actually a split.

**Fix:** In `create-checkout-payment-link/index.ts` line 170-178, conditionally write `split_payment_link_intent_id` only when `is_split` is true. For non-split links, write a different field (e.g., `payment_link_session_id`) or omit the split field entirely.

```text
const isSplit = amount_cents < (body.original_amount_cents || amount_cents);

const linkUpdate: Record<string, unknown> = {
  payment_link_url: session.url,
  payment_link_sent_at: new Date().toISOString(),
};

if (isSplit) {
  linkUpdate.split_payment_link_intent_id = session.id;
}

await supabase.from("appointments").update(linkUpdate).eq("id", appointment_id);
```

---

### B2. Floating Point Comparison in Rate Guard (Bug — P2)

`ZuraPayAfterpayTab.tsx` line 70: `if (num === surchargeRate * 100) return;` — JavaScript floating point means `0.07 * 100 === 7.000000000000001`, so the guard **never** prevents a redundant mutation for a 7% rate. The user loses nothing but it causes unnecessary DB writes on every blur.

**Fix:** Compare using `toFixed(2)` on both sides:
```text
if (num.toFixed(2) === (surchargeRate * 100).toFixed(2)) return;
```

---

### Implementation Summary

| Priority | ID | File | Change |
|----------|----|------|--------|
| P0 | B1 | `create-checkout-payment-link/index.ts` | Only write `split_payment_link_intent_id` when `is_split` is true |
| P2 | B2 | `ZuraPayAfterpayTab.tsx` | Use `toFixed(2)` comparison to avoid floating point mismatch |

No database migrations required.

