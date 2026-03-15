

# Admin-Initiated Backroom Activation (Charge Card on File)

## The Gap

Today, activating Backroom for an org requires the owner to go through Stripe Checkout themselves. There's no way for a Zura platform admin to say "activate Backroom for Acme Salon, charge their existing card." The existing `create-backroom-checkout` edge function creates a redirect-based checkout session — it doesn't support charging a saved payment method directly.

## What to Build

An **"Activate & Charge"** action in the Entitlements tab that lets a platform admin:
1. Select locations and plan tiers for an organization
2. Preview the cost breakdown
3. Confirm activation — which creates a Stripe subscription using the org's card already on file (their `stripe_customer_id` + default payment method)
4. Automatically creates the entitlement rows and enables the org master switch

## Changes

### 1. New Edge Function: `admin-activate-backroom`

Server-side function that:
- Validates the caller is a platform admin
- Looks up the org's `stripe_customer_id` and verifies they have a default payment method via `stripe.customers.retrieve`
- Creates a Stripe subscription directly using `stripe.subscriptions.create()` with `default_payment_method` (no checkout redirect) using the same price IDs from `create-backroom-checkout`
- If no payment method on file, returns an error telling admin the org needs a card first
- Enables the `backroom_enabled` org feature flag
- Creates `backroom_location_entitlements` rows for each location with correct plan tier
- Logs to `platform_audit_log`

### 2. UI: Activation Dialog in `BackroomEntitlementsTab.tsx`

Add an **"Activate & Charge"** button on the expanded org row (next to "Enable All"). Opens a dialog where admin:
- Sees the org name and whether they have a card on file
- Selects plan tier per location (starter/professional/unlimited)
- Selects scale count and billing interval (monthly/annual)
- Sees a live cost summary (reusing existing pricing constants)
- Confirms — which invokes the edge function

The button only appears when the org has a `stripe_customer_id` (i.e., they're already a paying Zura customer). If no card on file, show a disabled state with tooltip explaining why.

### 3. Fetch Card-on-File Status

Add a lightweight check in the entitlements tab that fetches `stripe_customer_id` from the `organizations` table for the expanded org. If present, the "Activate & Charge" button is enabled. The edge function does the actual payment method validation server-side.

## Files

| File | Action |
|------|--------|
| `supabase/functions/admin-activate-backroom/index.ts` | New — creates Stripe subscription using card on file, provisions entitlements |
| `src/components/platform/backroom/BackroomEntitlementsTab.tsx` | Add "Activate & Charge" button + dialog with plan/location configuration |
| `src/components/platform/backroom/AdminActivateDialog.tsx` | New — the activation dialog component (plan picker, cost preview, confirm) |

## Technical Notes

- Uses `stripe.subscriptions.create({ customer, items, payment_behavior: 'error_if_incomplete' })` to charge immediately — no redirect needed
- Reuses the exact same Stripe price IDs from `create-backroom-checkout` for consistency
- The subscription metadata mirrors what `create-backroom-checkout` sets, so the existing `stripe-webhook` handler processes renewals/cancellations identically
- Falls back gracefully: if the card is declined or missing, the edge function returns an error and no entitlements are created
- Follows the "Recommend → Simulate → Request Approval → Execute" pattern: the dialog shows a cost preview before the admin confirms

