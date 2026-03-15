

# Fix: Self-Service Backroom Activation via Stripe Checkout

## Problem

The checkout flow is broken in two ways:

1. **`create-backroom-checkout` doesn't pass `location_ids` to Stripe metadata** — The frontend sends `location_ids` in the request body, but the edge function never includes them in the checkout session's `metadata` or `subscription_data.metadata`. So when the Stripe webhook fires after payment, `metadata.location_ids` is empty and no location entitlements are created.

2. **The paywall shows a "Contact Zura" banner instead of the checkout flow** when `isPendingActivation` is true — but since the user *can* self-serve by paying, the pending activation banner with its email CTA is misleading. The user should just see the normal checkout paywall.

## Changes

### 1. `supabase/functions/create-backroom-checkout/index.ts`
- Destructure `location_ids` from the request body (already done on line 71)
- Add `location_ids: JSON.stringify(location_ids || [])` to both `metadata` and `subscription_data.metadata` objects so the webhook can read them
- Multiply plan quantity by number of selected locations (`quantity: location_ids.length || 1` instead of `quantity: 1`)

### 2. `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`
- Remove the `isPendingActivation` banner entirely — the paywall IS the activation path, regardless of whether the org flag is already on
- Keep the location status badges in the location selector so users can see which locations are already active vs not
- The checkout CTA is always the primary action

### 3. `src/hooks/backroom/useBackroomEntitlement.ts`
- No changes needed — the dual check (org flag + location entitlements) is correct. Once the webhook fires post-payment, both will be satisfied.

### 4. `src/pages/dashboard/admin/BackroomSettings.tsx`
- Remove the `isPendingActivation` prop pass-through since the paywall no longer needs it

