

# Fix: Slow Load on Products & Supplies Section

## Root Cause

The component eagerly fetches **4 parallel queries** on mount, even though most data isn't needed for the initial brand card grid:

1. **`useSupplyLibraryItems()`** — Fetches up to **5,000 rows** from `supply_library_products`. Only used for ghost-row matching when browsing inside a brand. Loaded immediately regardless.
2. **`useSupplyBrandsMeta()`** — Fetches all brand metadata. Needed for card logos but could use stale cache better.
3. **`useBackroomInventoryTable()`** — Fetches inventory projections joined with products. Only needed in "Inventory" view mode, but loaded even when showing "Brands" view.
4. **Main products query** — Fetches all org products. This one is actually needed.

Queries 1 and 3 are the heavy hitters and are completely unnecessary for the initial render.

## Plan

### File: `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx`

**1. Defer `useSupplyLibraryItems` until a brand is selected**
- Remove the top-level `useSupplyLibraryItems()` call
- Instead, use the existing `useSupplyLibraryItemsByBrand(selectedBrand)` hook which only fetches products for the selected brand (max ~1000 rows vs 5000)
- This eliminates the biggest query from the initial load

**2. Defer `useBackroomInventoryTable` until inventory view is active**
- Wrap the hook call so it only enables when `catalogView === 'inventory'`
- Pass an `enabled` flag or conditionally skip the query

**3. Increase `staleTime` on brand meta**
- The `useSupplyBrandsMeta` hook already has `staleTime: 120_000` which is fine, but ensure it's not refetching unnecessarily

### Net effect
- Initial load: **1 query** (org products) instead of **4 queries**
- Brand click: triggers brand-scoped library fetch (~100-500 rows instead of 5000)
- Inventory tab: triggers inventory fetch only when needed

No database changes. No new files. Single file edit.

