

# Fix: Add Missing `quantity` to Usage Line Item

## Root Cause

Line 105 in `create-backroom-checkout/index.ts`:
```typescript
{ price: BACKROOM_USAGE_PRICE_ID },  // missing quantity
```

Stripe API `2025-08-27.basil` requires `quantity` on **all** `line_items` entries, even metered/usage-based prices. The error message confirms: `"Quantity is required. Add quantity to line_items[1]"`.

## Fix

**File:** `supabase/functions/create-backroom-checkout/index.ts`, line 105

Add `quantity: 1` to the usage price line item:

```typescript
{ price: BACKROOM_USAGE_PRICE_ID, quantity: 1 },
```

This is standard for metered prices in checkout — `quantity: 1` just means 1 unit of the usage meter, and actual billing is based on reported usage.

Then redeploy the edge function.

