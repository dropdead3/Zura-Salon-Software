

## Afterpay Audit Pass 8 — Two Remaining Issues

The core split-payment flow is now structurally sound. Two lower-priority issues remain.

---

### B1. `phorest_appointments` Fallback Ignores Split Status (Bug — P1)

In `handlePaymentIntentSucceeded`, lines 720-727 always write `payment_status: 'paid'` to `phorest_appointments`, ignoring `resolvedStatus`. When the terminal fires first in a split, the appointments table correctly gets `partially_paid`, but the phorest fallback writes `paid` — creating an inconsistency between tables.

**Fix:** Use `resolvedStatus` instead of hardcoded `'paid'`:

```text
await supabase
  .from('phorest_appointments')
  .update({
    payment_status: resolvedStatus,
    payment_failure_reason: null,
  })
  .eq('id', appointmentId)
  .neq('payment_status', 'paid');
```

---

### B2. `handleCheckoutCompleted` Lacks Idempotency Guard (Enhancement — P2)

The appointments update on line 372-375 has no `.neq('payment_status', 'paid')` guard. If a webhook fires twice (Stripe retries), a completed `paid` appointment could be overwritten back to `partially_paid` in the split branch, or have its `paid_at` timestamp reset in the non-split branch.

**Fix:** Add `.neq('payment_status', 'paid')` to the update query:

```text
await supabase
  .from('appointments')
  .update(updatePayload)
  .eq('id', appointmentId)
  .neq('payment_status', 'paid');
```

---

### Implementation Summary

| Priority | ID | File | Change |
|----------|----|------|--------|
| P1 | B1 | `stripe-webhook/index.ts` | Use `resolvedStatus` in phorest_appointments fallback |
| P2 | B2 | `stripe-webhook/index.ts` | Add `.neq('payment_status', 'paid')` idempotency guard to checkout handler |

No database migrations required. Single file, two small changes.

