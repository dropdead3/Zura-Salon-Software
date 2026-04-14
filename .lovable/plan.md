

# Fix: S710 Fallback Price Showing $349 Instead of $299

## Root Cause

The edge function has two code paths:

1. **Stripe API success** — returns real prices from Stripe (both readers at $299)
2. **Fallback** — hardcoded prices used when the API call fails

The fallback data has S710 at **$349** (`34900` cents) while Stripe's actual catalog lists it at **$299**. Your page is hitting the fallback path (likely the hardware SKUs API is returning a non-200 status), so it displays the incorrect $349.

## Fix

### 1. Correct the S710 fallback price
**File:** `supabase/functions/terminal-hardware-order/index.ts`

Change the S710 fallback `amount` from `34900` to `29900` to match Stripe's published pricing.

### 2. Deploy the updated edge function

One-line change. Both cards will show $299.00 after this.

