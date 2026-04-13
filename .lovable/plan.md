

# Webhook Handler: `payment_method.detached` → Auto-Remove Cards on File

## Analysis

When a card is detached from a Stripe Customer (via Stripe Dashboard, customer portal, or API call), no local sync currently occurs. The `client_cards_on_file` row remains, creating a stale entry that would fail if charged. Since the table already uses hard deletes (both RLS policy and UI confirm this pattern), the webhook handler should hard-delete the matching row.

## Changes

### 1. Add `payment_method.detached` handler to webhook
**File:** `supabase/functions/stripe-webhook/index.ts`

New handler function `handlePaymentMethodDetached`:
1. Extract `id` (the payment method ID) from `event.data.object`
2. Look up `organization_id` from `organization_stripe_accounts` using `event.account` (Connected Account ID)
3. Delete from `client_cards_on_file` where `stripe_payment_method_id = id` and `organization_id` matches
4. Log outcome (deleted count or "not found" — both are fine since the card may never have been saved locally)

Add the case to the switch statement alongside `setup_intent.succeeded` in the Connect events section:
```
case "payment_method.detached":
  if (isConnectEvent) {
    await handlePaymentMethodDetached(supabase, event.data.object, event.account);
  }
  break;
```

No migration needed — the table already supports deletes via existing RLS policy.

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Add `payment_method.detached` case + handler |

0 migrations, 0 new edge functions, 0 new dependencies.

