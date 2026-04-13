

# Update `payment_intent.payment_failed` Handler for Card-on-File Charges

## Problem

The existing `handleTerminalPaymentIntentFailed` handler fires for all `payment_intent.payment_failed` events on Connected Accounts — including card-on-file charges — but it doesn't extract `charge_type` from metadata. The handler works correctly (sets `payment_status: 'failed'`), but the function name and logging are misleading, and the error message from Stripe's `last_payment_error` could be stored for staff visibility.

## Changes

### 1. Rename and enhance `handleTerminalPaymentIntentFailed` → `handlePaymentIntentFailed`
**File:** `supabase/functions/stripe-webhook/index.ts`

- Read `metadata.charge_type` to distinguish terminal vs card-on-file failures
- Store the Stripe error reason in a new `payment_failure_reason` column so front desk staff can see *why* the charge failed (e.g., "Your card was declined", "Insufficient funds")
- Update logging to reflect charge type
- Keep existing idempotency guard (`neq('payment_status', 'paid')`)

```text
Before:
  .update({ payment_status: 'failed' })

After:
  .update({
    payment_status: 'failed',
    payment_failure_reason: errorMsg,
  })
```

### 2. Migration: Add `payment_failure_reason` column to appointments

```sql
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_failure_reason text;
```

This gives the Operations Hub and dock cards access to the decline reason without requiring a Stripe Dashboard lookup.

### 3. Update switch case reference

Rename the function call from `handleTerminalPaymentIntentFailed` to `handlePaymentIntentFailed` in the switch statement.

## Technical Details

- The `charge-card-on-file` edge function already sets `metadata: { charge_type: "card_on_file", appointment_id: "..." }` on PaymentIntents, so the failed event carries the same metadata
- The handler already correctly guards against overwriting `paid` status
- No UI changes in this step — the `payment_failure_reason` column is available for future Operations Hub display

## Files Summary

| File | Action |
|------|--------|
| **Migration** | Add `payment_failure_reason` column to `appointments` |
| `supabase/functions/stripe-webhook/index.ts` | Rename handler, extract `charge_type`, store failure reason |

1 migration, 0 new edge functions, 0 new dependencies.

