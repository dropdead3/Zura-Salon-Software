

# Fix Per-Model Pricing — Separate S700 and S710 SKUs

## Root cause

The edge function groups all non-accessory reader SKUs together. Both `skus` (all SKUs) and `s710_skus` contain the same reader entries without distinguishing S700 from S710. The fallback returns a single combined "S700/S710" SKU. The frontend's `.find(s => s.product.includes('s700'))` fails because no SKU is specifically labeled as one model versus the other.

## Changes

### 1. Edge function: Separate S700 and S710 SKU arrays
**File:** `supabase/functions/terminal-hardware-order/index.ts`

Split non-accessory reader SKUs into two arrays based on product name:
- `s700Skus` — product name contains "s700" but not "s710"
- `s710Skus` — product name contains "s710"
- If a SKU matches neither specifically (e.g. generic "BBPOS" or "Verifone" reader), default it to `s700Skus`

Return them as distinct fields:
```json
{
  "source": "stripe_api",
  "skus": [...],          // all reader SKUs (backward compat)
  "s700_skus": [...],     // S700-only
  "s710_skus": [...],     // S710-only
  "accessories": [...]
}
```

Update fallback to return two separate reader entries:
```json
{
  "skus": [
    { "id": "s700_reader", "product": "Zura Pay Reader S700", "amount": 29900, ... },
    { "id": "s710_reader", "product": "Zura Pay Reader S710", "amount": 34900, ... }
  ],
  "s700_skus": [{ ... s700 entry ... }],
  "s710_skus": [{ ... s710 entry ... }]
}
```

Note: If Stripe currently returns only one reader SKU (e.g. "S700"), both cards may still show the same price. The architecture will correctly differentiate once Stripe's catalog has distinct SKUs. The fallback will use distinct placeholder prices so the UI is never identical.

### 2. Update hook interface
**File:** `src/hooks/useTerminalHardwareOrder.ts`

Add `s700_skus` to the `SkuResponse` interface.

### 3. Update frontend SKU resolution
**File:** `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx`

Change SKU derivation to use the new dedicated arrays:
```ts
const s700Sku = skuData?.s700_skus?.[0] || skuData?.skus?.[0];
const s710Sku = skuData?.s710_skus?.[0] || s700Sku;
```

This is more reliable than string-matching product names.

### 4. Add fallback images for S700
**File:** `supabase/functions/terminal-hardware-order/index.ts`

Add an `s700_reader` fallback image URL alongside the existing `s710_reader` entry so each card can display the correct device image.

## Technical note

Stripe's terminal hardware SKU catalog may or may not have separate S700/S710 listings depending on your account's provisioning. The fallback pricing ensures the UI always shows differentiated cards. Once the Stripe catalog includes both models, live pricing will flow through automatically.

