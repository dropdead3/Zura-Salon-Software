

# Insert `appointment_fee_charges` Records for Deposit & Fee Charges

## Problem

The `appointment_fee_charges` table exists in the schema with all the right columns (`fee_type`, `fee_amount`, `status`, `collected_via`, `charged_at`, etc.) but is **never written to** — not by the webhook on online booking deposits, and not by the `charge-card-on-file` edge function on manual/no-show/cancellation charges. The fee ledger is completely dormant.

This means there is no unified audit trail for fees charged against appointments. The Payment Operations page and any future reporting surface cannot query a single table to answer "what fees were charged, when, and how?"

## Approach

Write a fee ledger record in **both** collection paths:

1. **Webhook path** — when `payment_intent.succeeded` reconciles an online booking deposit
2. **Manual charge path** — when `charge-card-on-file` successfully creates a Stripe charge for no-show, cancellation, or manual fees

## Changes

### 1. `supabase/functions/stripe-webhook/index.ts` — `handlePaymentIntentSucceeded`

After the deposit reconciliation block (line 593-598), insert a fee ledger record:

```typescript
if (metadata?.source === 'online_booking' && metadata?.fee_type === 'deposit') {
  // existing: updatePayload.deposit_status, deposit_collected_at, deposit_stripe_payment_id
  
  // NEW: insert fee ledger record
  const depositAmount = paymentIntent.amount / 100; // cents → dollars
  await supabase.from('appointment_fee_charges').insert({
    organization_id: organizationId,
    appointment_id: appointmentId,
    fee_type: 'deposit',
    fee_amount: depositAmount,
    status: 'collected',
    collected_via: 'online_booking',
    charged_at: new Date().toISOString(),
  });
}
```

Requires resolving `organizationId` — already available from the appointment lookup or metadata.

### 2. `supabase/functions/charge-card-on-file/index.ts`

After the Stripe PaymentIntent is created successfully, insert a fee ledger record:

```typescript
await supabase.from('appointment_fee_charges').insert({
  organization_id,
  appointment_id,
  fee_type: fee_type || 'manual',
  fee_amount: amount,
  status: 'collected',
  collected_via: 'card_on_file',
  charged_at: new Date().toISOString(),
});
```

This captures no-show fees, cancellation fees, and manual charges in the same ledger.

## Technical Details

- `fee_type` values: `'deposit'` (online), `'no_show'`, `'cancellation'`, `'manual'` (from charge-card-on-file)
- `collected_via` values: `'online_booking'`, `'card_on_file'`
- `status` defaults to `'pending'` in the schema, so we explicitly set `'collected'` since both paths only write after successful Stripe confirmation
- `policy_id` is left null for online deposits (no policy association); for manual charges it could be passed through if available (future enhancement)
- No migration needed — table already exists with all required columns

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Insert fee ledger record on deposit reconciliation |
| `supabase/functions/charge-card-on-file/index.ts` | Insert fee ledger record after successful charge |

0 migrations, 0 new edge functions, 0 new dependencies.

