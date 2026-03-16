

# Fix: Slow Redirect and Preview Navigation Issue

## Problem 1: "Nothing loads" in preview
The Lovable preview iframe blocks navigation to `checkout.stripe.com`. The fix is to open Stripe Checkout in a new tab instead of `window.location.href`.

**File:** `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (line 290)

Change:
```typescript
window.location.href = data.url;
```
To:
```typescript
window.open(data.url, '_blank');
```

Also apply the same fix in `src/components/dashboard/backroom-settings/AddScalesDialog.tsx` (line 43).

## Problem 2: Slow redirect (~3s)
The edge function makes 4-5 sequential Stripe API calls. We can parallelize the independent ones:
- Customer lookup and price retrieval can happen in parallel
- Invoice item creation must happen before session creation

**File:** `supabase/functions/create-backroom-checkout/index.ts`

Parallelize the hardware price retrieval with the customer lookup/creation step using `Promise.all` where possible, shaving ~500-800ms off the total time.

## Why not Shopify
Shopify is designed for physical product catalogs, not SaaS subscriptions with metered billing. Your pricing model ($20/mo per location + $0.50 per color service + scale licenses) is a perfect Stripe use case that Shopify cannot replicate.

