

# Webhook Handler: `payment_method.updated` → Sync Card Details

## Why

Stripe card networks periodically auto-update card details (new expiration date, updated last4 after reissue). When this happens, Stripe fires `payment_method.updated` — but without a handler, the local `client_cards_on_file` row displays stale card metadata in the UI.

## Changes

### 1. Add `handlePaymentMethodUpdated` to webhook
**File:** `supabase/functions/stripe-webhook/index.ts`

New handler following the same org-lookup pattern as `handlePaymentMethodDetached`:
1. Extract `id`, `card.brand`, `card.last4`, `card.exp_month`, `card.exp_year` from `event.data.object`
2. Look up `organization_id` from `organization_stripe_accounts` using `event.account`
3. Update `client_cards_on_file` where `stripe_payment_method_id` and `organization_id` match, setting the four card detail columns

Add the case to the switch statement alongside the other card-lifecycle handlers:
```
case "payment_method.updated":
  if (isConnectEvent) {
    await handlePaymentMethodUpdated(supabase, event.data.object, event.account);
  }
  break;
```

No migration needed — all four columns (`card_brand`, `card_last4`, `card_exp_month`, `card_exp_year`) already exist on `client_cards_on_file`.

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Add `payment_method.updated` case + `handlePaymentMethodUpdated` handler |

0 migrations, 0 new edge functions, 0 new dependencies.

