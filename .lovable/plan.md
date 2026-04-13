

# Set `deposit_stripe_payment_id` in Webhook Handler

## Problem
The `appointments` table has a `deposit_stripe_payment_id` column designed for refund traceability, but the `payment_intent.succeeded` webhook handler never populates it. When a deposit is collected via the online booking flow, only `deposit_status` and `deposit_collected_at` are set — the actual Stripe PaymentIntent ID that processed the deposit is lost. This makes refund workflows blind to which PI to target.

## Change

### Modified: `supabase/functions/stripe-webhook/index.ts`

In the online booking deposit reconciliation block (line 593-596), add one field to the update payload:

```typescript
if (metadata?.source === 'online_booking' && metadata?.fee_type === 'deposit') {
  updatePayload.deposit_status = 'collected';
  updatePayload.deposit_collected_at = new Date().toISOString();
  updatePayload.deposit_stripe_payment_id = piId;  // ← new line
}
```

This ensures the deposit's PaymentIntent ID is persisted separately from `stripe_payment_intent_id` (which tracks the general service payment), enabling precise refund targeting via `stripe.refunds.create({ payment_intent: deposit_stripe_payment_id })`.

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Add `deposit_stripe_payment_id = piId` to deposit reconciliation block |

0 migrations, 0 new edge functions, 0 new dependencies.

