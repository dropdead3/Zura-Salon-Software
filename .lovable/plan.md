

# Webhook Handler: `setup_intent.succeeded` → Auto-Insert Cards on File

## Analysis

The public booking flow will use Stripe Elements to create a `SetupIntent` on the Connected Account. When the customer completes card setup, Stripe fires `setup_intent.succeeded` — but the current webhook has no handler for this event. Cards saved during booking are only persisted if the client-side code manually inserts into `client_cards_on_file` after Stripe confirms. This is fragile: if the browser closes, the card is saved in Stripe but never recorded locally.

Adding a webhook handler creates a reliable server-side sync path that guarantees every successfully saved card appears in the management surface.

## Changes

### 1. Add `setup_intent.succeeded` handler to webhook
**File:** `supabase/functions/stripe-webhook/index.ts`

New handler function `handleSetupIntentSucceeded`:
1. Extract `payment_method` (ID string) from the SetupIntent object
2. Expand payment method details by calling Stripe API: `GET /v1/payment_methods/{pm_id}` using the Connected Account's credentials
3. Extract `customer` ID from the SetupIntent
4. Look up the `organization_id` from `organization_stripe_accounts` using `event.account` (the Connected Account ID)
5. Look up the `client_id` from `client_cards_on_file` or `phorest_clients` by matching `stripe_customer_id`
6. If client found: upsert into `client_cards_on_file` with `stripe_payment_method_id`, `stripe_customer_id`, `card_brand`, `card_last4`, `card_exp_month`, `card_exp_year`, `organization_id`, `client_id`
7. Use upsert (ON CONFLICT on `stripe_payment_method_id` + `organization_id`) to avoid duplicates if the client-side also inserts

Add the case to the switch statement under the Connect terminal events section (since SetupIntents are created on Connected Accounts).

### 2. Handle metadata for client resolution
The SetupIntent should carry `client_id` in its metadata (set during the booking flow). The handler will:
- First check `setup_intent.metadata.client_id`
- Fallback: look up by `stripe_customer_id` in `phorest_clients` or `client_cards_on_file`

This ensures the handler works even if the booking surface hasn't been updated to pass metadata yet.

## Migration

Add a unique constraint on `client_cards_on_file` for upsert support:
```sql
ALTER TABLE client_cards_on_file
ADD CONSTRAINT client_cards_on_file_pm_org_unique
UNIQUE (stripe_payment_method_id, organization_id);
```

## Files Summary

| File | Action |
|------|--------|
| **Migration** | Add unique constraint on `(stripe_payment_method_id, organization_id)` for upsert |
| `supabase/functions/stripe-webhook/index.ts` | Add `setup_intent.succeeded` case + `handleSetupIntentSucceeded` handler |

1 migration, 0 new edge functions, 0 new dependencies.

