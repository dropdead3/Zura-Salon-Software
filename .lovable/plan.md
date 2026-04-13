

# Wire Webhook Reconciliation for Online Booking Payments

## Problem

Two gaps in the Stripe webhook → appointment reconciliation loop:

1. **`payment_intent.succeeded`** (line 566): Updates `payment_status = 'paid'` generically. When the PI metadata contains `source: 'online_booking'` + `fee_type: 'deposit'`, it should also set `deposit_status = 'collected'` and `deposit_collected_at` on the appointment — currently it does not.

2. **`setup_intent.succeeded`** (line 804): Inserts into `client_cards_on_file` correctly, but when metadata contains `source: 'online_booking'` + `appointment_id`, it should also update the appointment's `card_on_file_required` flag to reflect fulfillment (e.g., set a `card_on_file_collected = true` or similar status field).

Additionally, **B3 from the prior audit remains unfixed**: four handlers (`handlePaymentMethodDetached`, `handlePaymentMethodUpdated`, `handleSetupIntentSucceeded`, `handleCustomerDeleted`) still look up orgs via the legacy `organization_stripe_accounts` table instead of `organizations.stripe_connect_account_id`.

## Changes

### Modified: `supabase/functions/stripe-webhook/index.ts`

**1. Enhance `handlePaymentIntentSucceeded` (line 566)**
- After the existing metadata check, detect `source === 'online_booking'` and `fee_type === 'deposit'`
- When matched, add `deposit_status: 'collected'` and `deposit_collected_at: new Date().toISOString()` to the existing `updatePayload`
- No new handler needed — just extend the existing payload conditionally

**2. Enhance `handleSetupIntentSucceeded` (line 804)**
- After the card upsert succeeds, check if metadata contains `source === 'online_booking'` and `appointment_id`
- If so, update the appointment: set `card_on_file_id` to the newly upserted card's ID (query it back by `stripe_payment_method_id + organization_id`) and clear any pending card requirement
- Also update the client record's `stripe_customer_id` if not already set

**3. Standardize org lookup in four handlers (B3 — carried forward)**
- `handlePaymentMethodDetached` (line 672): Replace `organization_stripe_accounts` lookup with `organizations` table using `.eq("stripe_connect_account_id", connectedAccountId)`
- `handlePaymentMethodUpdated` (line 768): Same change
- `handleSetupIntentSucceeded` (line 821): Same change
- `handleCustomerDeleted` (line 717): Same change

## Technical Details

```typescript
// In handlePaymentIntentSucceeded — conditional deposit fields
if (metadata?.source === 'online_booking' && metadata?.fee_type === 'deposit') {
  updatePayload.deposit_status = 'collected';
  updatePayload.deposit_collected_at = new Date().toISOString();
}

// In handleSetupIntentSucceeded — after card upsert, link to appointment
if (metadata?.source === 'online_booking' && metadata?.appointment_id) {
  const { data: card } = await supabase
    .from("client_cards_on_file")
    .select("id")
    .eq("stripe_payment_method_id", paymentMethodId)
    .eq("organization_id", organizationId)
    .single();
  
  if (card) {
    await supabase
      .from("appointments")
      .update({ card_on_file_id: card.id })
      .eq("id", metadata.appointment_id)
      .eq("organization_id", organizationId);
  }
}

// Standardized org lookup (replaces organization_stripe_accounts in 4 handlers)
const { data: org } = await supabase
  .from("organizations")
  .select("id")
  .eq("stripe_connect_account_id", connectedAccountId)
  .maybeSingle();
const organizationId = org?.id;
```

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Extend PI succeeded for deposit reconciliation, extend SI succeeded for card linking, standardize org lookup in 4 handlers |

0 migrations, 0 new edge functions, 0 new dependencies.

