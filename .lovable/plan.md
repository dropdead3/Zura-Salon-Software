

# Add "Missing Pricing" Filter to Supply Library Brand Detail

## Problem
After adding wholesale pricing columns, admins need a quick way to locate products that still lack pricing data so they can fill in costs.

## Changes

**`src/components/platform/backroom/SupplyLibraryTab.tsx`**

1. **Add `pricingFilter` state** — `'all' | 'missing' | 'priced'`, default `'all'`.

2. **Add a pricing filter Select** next to the existing category filter (line ~547-563). Options:
   - "All Pricing" (default)
   - "Missing Price" — filters to `wholesale_price == null`
   - "Priced" — filters to `wholesale_price != null`

3. **Update `categoryGroups` memo** (line ~118-134) to also apply the `pricingFilter` before grouping:
   - `'missing'`: include only products where `wholesale_price` is null
   - `'priced'`: include only products where `wholesale_price` is not null

4. **Reset on navigation**: Clear `pricingFilter` to `'all'` when navigating back to brand grid (alongside `setCategoryFilter('all')`).

Single file, ~15 lines of additions. No new hooks or components needed.

