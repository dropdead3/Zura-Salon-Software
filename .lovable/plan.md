

## Afterpay Audit Pass 9 — Two Remaining Issues

The split-payment flow is structurally correct for the happy path. Two edge-case issues remain.

---

### B1. `handlePaymentIntentFailed` Overwrites `partially_paid` with `failed` (Bug — P1)

In `handlePaymentIntentFailed` (line 756-765), the failed handler writes `payment_status: 'failed'` with only a `.neq('payment_status', 'paid')` guard. This does not protect `partially_paid`.

**Scenario:**
1. Split payment — link leg fires first, appointment is `partially_paid`
2. Terminal charge fails → overwrites status to `failed`
3. Staff retries terminal → succeeds → terminal handler sees `split_payment_link_intent_id` exists, `payment_status` is `failed` (not `partially_paid`) → sets `partially_paid` again
4. Appointment stuck at `partially_paid` forever — no second leg will fire because the link already completed

The failed handler should not overwrite `partially_paid`, since one leg has already been collected.

**Fix:** Add `.neq('payment_status', 'partially_paid')` to both update queries in `handlePaymentIntentFailed`:

```text
await supabase
  .from('appointments')
  .update(failPayload)
  .eq('id', appointmentId)
  .neq('payment_status', 'paid')
  .neq('payment_status', 'partially_paid');

await supabase
  .from('phorest_appointments')
  .update(failPayload)
  .eq('id', appointmentId)
  .neq('payment_status', 'paid')
  .neq('payment_status', 'partially_paid');
```

---

### B2. `handleCheckoutCompleted` Does Not Sync to `phorest_appointments` (Bug — P2)

The terminal handler (`handlePaymentIntentSucceeded`, line 720-728) syncs status to `phorest_appointments` as a fallback. The checkout handler (`handleCheckoutCompleted`, line 372-376) only updates `appointments` — it never touches `phorest_appointments`. If an appointment exists in the phorest table, checkout completion won't be recorded.

**Fix:** Add a matching phorest fallback after the appointments update:

```text
await supabase
  .from('appointments')
  .update(updatePayload)
  .eq('id', appointmentId)
  .neq('payment_status', 'paid');

// Fallback: also try phorest_appointments
await supabase
  .from('phorest_appointments')
  .update(updatePayload)
  .eq('id', appointmentId)
  .neq('payment_status', 'paid');
```

---

### Implementation Summary

| Priority | ID | File | Change |
|----------|----|------|--------|
| P1 | B1 | `stripe-webhook/index.ts` | Add `.neq('payment_status', 'partially_paid')` to failed handler |
| P2 | B2 | `stripe-webhook/index.ts` | Add `phorest_appointments` fallback to checkout handler |

No database migrations required. Single file, two small changes.

