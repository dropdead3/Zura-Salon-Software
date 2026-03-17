

# Fix: Supply Library Not Showing All Brands (1,000 Row Limit)

## Root Cause

The `useSupplyLibraryItems()` hook in `src/hooks/platform/useSupplyLibrary.ts` queries `supply_library_products` with `.select('*')` but doesn't override Supabase's default 1,000 row limit. The DB has **2,782 active products across 27 brands**, so only the first ~13 brands (alphabetically through "Keune") are returned.

## Fix

**File: `src/hooks/platform/useSupplyLibrary.ts`** — Two-pronged approach:

1. **For the brand grid (Level 0):** The dialog already computes brand card data from the full product list. Instead of fetching all 2,782 rows just to count brands, use the existing `useSupplyLibraryBrandSummaries` RPC (already defined in this file) which aggregates server-side with no row limit.

2. **For the product list (Level 1):** Paginate or use a brand-specific query. The simplest and most effective fix: add a new hook `useSupplyLibraryItemsByBrand(brand)` that fetches only one brand's products at a time (max ~263 rows for the largest brand), well under the 1,000 limit.

3. **Fallback fix for the catch-all hook:** Also add `.range(0, 4999)` to `useSupplyLibraryItems()` so any other consumer that still uses the full list gets all rows. This is a safety net.

**File: `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx`** — Refactor to:
- Build the brand grid from `useSupplyLibraryBrandSummaries()` (server-side aggregation) instead of grouping client-side from the truncated product list
- Fetch products per-brand on drill-in using the new `useSupplyLibraryItemsByBrand(selectedBrand)` hook
- Remove dependency on the single mega-query for computing brand cards

This eliminates the row limit issue entirely and also improves performance (no 2,782-row fetch on dialog open).

