

# Fix `payment_intent.succeeded` Handler for Card-on-File Charges

## Problem

The `charge-card-on-file` edge function creates PaymentIntents on Connected Accounts with metadata `{ charge_type: "card_on_file", appointment_id: "..." }`. When these succeed, the existing `handleTerminalPaymentIntentSucceeded` handler fires — but it unconditionally sets `payment_method: 'card_reader'`, incorrectly labeling card-on-file charges as terminal payments.

A separate `charge.succeeded` handler is unnecessary because `payment_intent.succeeded` already covers this event. The fix is to make the existing handler metadata-aware.

## Changes

### 1. Update `handleTerminalPaymentIntentSucceeded` → rename to `handlePaymentIntentSucceeded`
**File:** `supabase/functions/stripe-webhook/index.ts`

- Read `metadata.charge_type` from the PaymentIntent
- Set `payment_method` based on `charge_type`:
  - `"card_on_file"` → `payment_method: "card_on_file"`
  - Default (terminal) → `payment_method: "card_reader"` (preserves existing behavior)
- Add `paid_at: new Date().toISOString()` to the update to record the transaction timestamp
- Keep the existing idempotency guard (`neq('payment_status', 'paid')`)

```text
Before:
  .update({
    payment_status: 'paid',
    payment_method: 'card_reader',        ← always card_reader
    stripe_payment_intent_id: piId,
  })

After:
  .update({
    payment_status: 'paid',
    payment_method: chargeType === 'card_on_file' ? 'card_on_file' : 'card_reader',
    stripe_payment_intent_id: piId,
    paid_at: new Date().toISOString(),
  })
```

### 2. Migration: Add `paid_at` column to appointments
New column to record when payment was actually confirmed (vs. when the appointment was created):

```sql
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS paid_at timestamptz;
```

## Why Not `charge.succeeded`?

- `payment_intent.succeeded` already fires for both terminal and card-on-file charges on Connected Accounts
- The metadata (`charge_type`, `appointment_id`) is already set by the `charge-card-on-file` edge function
- Adding `charge.succeeded` would create duplicate handling for the same payment event

## Files Summary

| File | Action |
|------|--------|
| **Migration** | Add `paid_at` column to `appointments` |
| `supabase/functions/stripe-webhook/index.ts` | Update handler to read `charge_type` metadata and set correct `payment_method` + `paid_at` |

1 migration, 0 new edge functions, 0 new dependencies.

