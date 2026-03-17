

# Fix: Brand Card Product Counts Truncated by 1,000-Row Query Limit

## Root Cause

`useSupplyLibraryProducts()` (no filters) fetches all rows from `supply_library_products` via a single `.select('*')` call. Supabase caps this at 1,000 rows. The DB has 2,516 active products, so the brand card grid only sees the first 1,000 — producing incorrect counts.

## Solution

**Replace the "fetch all products" approach for brand cards with a dedicated aggregation query** that returns only brand-level summaries, avoiding the row limit entirely.

### Changes — `src/hooks/platform/useSupplyLibrary.ts`

Add a new hook `useSupplyLibraryBrandSummaries` that fetches brand + category counts using a grouped query:

```sql
SELECT brand, category, count(*) as cnt
FROM supply_library_products
WHERE is_active = true
GROUP BY brand, category
ORDER BY brand
```

This returns ~100-200 rows (one per brand×category combo) — well under the limit — and provides exactly what the brand cards need: product count and category breakdown per brand.

### Changes — `src/components/platform/backroom/SupplyLibraryTab.tsx`

1. Replace the `allProducts` fetch (line 138) with the new `useSupplyLibraryBrandSummaries` hook for building brand cards.
2. Update the `brandCards` memo (line 157) to consume the summary data instead of iterating raw products.
3. Keep the existing `brandProducts` fetch (line 140) for the detail view — that one is brand-filtered and stays under 1,000.

### Why not paginate?

Fetching all 2,500+ product rows just to count them per brand is wasteful. A server-side aggregation is the correct fix — faster, lighter, and limit-proof.

