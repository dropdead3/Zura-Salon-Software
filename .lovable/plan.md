

# Restyle Backroom Product Catalog — Brand-First Architecture

## Current Problem
The org-level Backroom Product Catalog is a flat list of all salon products with an inline A-Z brand browser tacked on. It doesn't match the platform Supply Library's premium brand-card-first experience. Users currently toggle individual product rows on/off — there's no way to enable entire categories or product lines at once.

## New Architecture

### Level 0: Brand Card Grid (replaces current flat list)
- Show brand cards for brands the salon has products from (query `products` table grouped by `brand` where `organization_id = orgId` and `product_type = 'Supplies'`)
- Also show brands available in the supply library that the salon hasn't added yet (dimmed/outlined cards with "Add" action)
- Reuse the same `PlatformCard variant="interactive" size="md"` layout from `SupplyLibraryTab` — logo, product count badge, category summary footer
- Brand logos from `supply_library_brands` table (same `useSupplyBrandsMeta` hook)
- A-Z alphabet selector + search bar above the grid (matching platform pattern)
- KPI row (tracked count, in-stock, to-reorder) stays but moves above the brand grid

### Level 1: Brand Catalog (opens when card clicked)
- Breadcrumb: `My Catalog / {Brand}`
- Three-column Finder-style browser reusing `BrowseColumn` component from platform:
  - Column 1: **Categories** (color, developer, toner, etc.) with product counts and health dots
  - Column 2: **Product Lines** within selected category (grouped by `extractProductLine`)
  - Column 3: **Products** table for selected product line
- **Bulk toggle controls** at each level:
  - Category header: "Track All in {Category}" switch — turns on `is_backroom_tracked` for all products in that category+brand
  - Product Line header: "Track All in {Product Line}" switch — same but scoped to product line
  - Individual product row: existing toggle switch
- Products not yet in the salon's catalog but present in the supply library show as ghost rows with an "Add" button

### Level 2: Product Row (within the Finder table)
- Simplified from current: Name, tracking toggle, depletion method select, billable/overage switches
- Pricing inputs (cost/g, container, markup) shown inline when tracked
- Same `ProductRow` component logic, adapted to table layout

## Technical Plan

### File Changes

**`BackroomProductCatalogSection.tsx`** — Major rewrite (~1360 lines):
1. Replace the flat product list and inline A-Z brand browsing with a brand card grid as the default view
2. Add `selectedBrand` state (already exists but underused) as the primary navigation driver
3. When `selectedBrand` is set, render a three-column Finder using `BrowseColumn` from `@/components/platform/backroom/BrowseColumn`
4. Add bulk tracking mutations:
   - `toggleCategoryTracking(brand, category, enabled)` — updates all products matching brand+category
   - `toggleProductLineTracking(brand, category, productLine, enabled)` — updates products matching brand+category+product line pattern
5. Import `useSupplyBrandsMeta` for brand logos
6. Import `groupByProductLine`, `extractProductLine` from `@/lib/supply-line-parser` for Finder column grouping
7. Keep the table/inventory view toggle but move it to the brand detail level (not top-level)
8. Retain all existing mutations, inventory table row logic, bulk pricing, and reorder dialogs

**No new files needed** — reuses existing `BrowseColumn`, platform UI components, and supply library hooks.

**No database changes** — all data already exists in `products` and `supply_library_products` tables.

### Data Flow
```text
products (org-scoped) ──→ group by brand ──→ Brand Cards
                      ──→ filter by brand+category ──→ BrowseColumn (categories)
                      ──→ groupByProductLine() ──→ BrowseColumn (product lines)
                      ──→ filter by line ──→ Product Table

supply_library_products ──→ "available but not stocked" ghost items
supply_library_brands ──→ brand logos for cards
```

### Bulk Toggle Logic
- "Track All" at category level: `UPDATE products SET is_backroom_tracked = true WHERE org_id = ? AND brand = ? AND category = ?`
- "Track All" at product line level: filter products whose name matches the product line prefix, update `is_backroom_tracked`
- Both use existing `updateMutation` pattern with batch updates

### What's Preserved
- Inventory table view (KPI cards + stock table) — accessible from within a brand or as a global toggle
- All pricing inline editing (cost/g, markup, container)
- Bulk pricing dialog, bulk reorder dialog
- Supply Library dialog for adding new products
- Product row toggle, depletion method, billable/overage switches

