

# Payment Method Column in Backroom Entitlements Tab

## Overview

Add a "Payment Method" column to the org table in the Backroom Entitlements tab showing card brand and last-4 digits. This gives platform admins instant visibility into which orgs can be admin-activated (card on file) vs which need to add a card first.

## Approach

The `organizations` table already has `stripe_customer_id`. A new edge function will accept a batch of Stripe customer IDs and return a map of `customer_id → { brand, last4 }` by retrieving each customer's default payment method from Stripe. The entitlements tab will call this once after orgs load, then display the info inline.

## Changes

### 1. New Edge Function: `batch-payment-methods`

Accepts `{ stripe_customer_ids: string[] }`. For each ID, retrieves the Stripe customer's default payment method and returns `{ [customer_id]: { brand, last4 } | null }`. Platform-user auth required. Caps batch size at 100 to avoid timeouts.

Uses `Promise.allSettled` for parallel Stripe lookups, so one failure doesn't block the rest.

### 2. New Hook: `useBatchPaymentMethods`

In `src/hooks/platform/useBatchPaymentMethods.ts`. Accepts an array of `{ orgId, stripeCustomerId }` pairs, invokes the edge function, and returns a `Map<orgId, { brand, last4 }>`. Only fires when there are customer IDs to look up. Uses a 5-minute stale time.

### 3. Modify: `BackroomEntitlementsTab.tsx`

- Add `OrgWithBackroom.payment_info?: { brand: string; last4: string } | null` 
- Call `useBatchPaymentMethods` with the loaded orgs that have `stripe_customer_id`
- Add a "Payment" column header between "Org Tier" and "Activated"
- Render: card emoji + brand + `····last4` if present, "No card" in muted text if `stripe_customer_id` exists but no PM, dash if no Stripe customer at all

### 4. Config: `supabase/config.toml`

Add `[functions.batch-payment-methods]` with `verify_jwt = false`.

## Files

| File | Action |
|------|--------|
| `supabase/functions/batch-payment-methods/index.ts` | New — batch Stripe PM lookup |
| `src/hooks/platform/useBatchPaymentMethods.ts` | New — hook wrapping the edge function |
| `src/components/platform/backroom/BackroomEntitlementsTab.tsx` | Add Payment column + integrate hook |
| `supabase/config.toml` | Add function entry |

