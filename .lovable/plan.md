

# Webhook Handler: `customer.deleted` → Bulk-Remove Cards on File

## Analysis

When a Stripe Customer object is deleted from a Connected Account (via Dashboard or API), all attached PaymentMethods are implicitly detached by Stripe — but Stripe does **not** fire individual `payment_method.detached` events for each one. This means the existing detach handler won't cover this case, and all `client_cards_on_file` rows referencing that customer's `stripe_customer_id` become orphaned.

A dedicated `customer.deleted` handler that bulk-deletes by `stripe_customer_id` + `organization_id` closes this gap.

## Changes

### 1. Add `customer.deleted` handler to webhook
**File:** `supabase/functions/stripe-webhook/index.ts`

New handler function `handleCustomerDeleted`:
1. Extract `id` (the Stripe Customer ID, `cus_...`) from `event.data.object`
2. Look up `organization_id` from `organization_stripe_accounts` using `event.account`
3. Delete all rows from `client_cards_on_file` where `stripe_customer_id = id` and `organization_id` matches
4. Log the count of deleted rows

Add the case to the switch statement in the Connect events section:
```
case "customer.deleted":
  if (isConnectEvent) {
    await handleCustomerDeleted(supabase, event.data.object, event.account);
  }
  break;
```

The handler mirrors the existing `handlePaymentMethodDetached` pattern — same org lookup, same hard-delete approach, just keyed on `stripe_customer_id` instead of `stripe_payment_method_id`.

No migration needed — `stripe_customer_id` column already exists on `client_cards_on_file`.

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Add `customer.deleted` case + `handleCustomerDeleted` handler |

0 migrations, 0 new edge functions, 0 new dependencies.

