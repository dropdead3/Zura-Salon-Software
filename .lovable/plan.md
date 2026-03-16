

# Fix: Stripe API Breaking Change in `create-backroom-checkout`

## Two Issues

**Issue 1 — Runtime error (`effectiveOrganization is not defined`)**: The source code no longer contains this reference (the previous fix was applied correctly). This is a stale build artifact that will resolve once the edge function is redeployed. No code change needed.

**Issue 2 — Stripe API error (`Received unknown parameter: price`)**: This is the actual blocker. The `invoiceItems.create` call on line 132-137 of the edge function uses `price: SCALE_HARDWARE_PRICE_ID`, but in Stripe API version `2025-08-27.basil`, the invoice items API renamed the `price` parameter to a nested `pricing` object.

The current code:
```typescript
await stripe.invoiceItems.create({
  customer: customerId,
  price: SCALE_HARDWARE_PRICE_ID,    // ← rejected by API
  quantity: scaleQty,
  description: `...`,
});
```

The Stripe docs now require:
```typescript
await stripe.invoiceItems.create({
  customer: customerId,
  pricing: { price: SCALE_HARDWARE_PRICE_ID },  // ← new format
  quantity: scaleQty,
  description: `...`,
});
```

## Fix

**File:** `supabase/functions/create-backroom-checkout/index.ts`

Change line 134 from `price: SCALE_HARDWARE_PRICE_ID` to `pricing: { price: SCALE_HARDWARE_PRICE_ID }` inside the `stripe.invoiceItems.create()` call. Then redeploy the edge function.

