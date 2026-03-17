

# Redesign Supply Library Product Selection to Use 3-Column Finder

## Problem
The current product selection view (Level 1 — after clicking a brand) shows a flat scrollable list of product cards grouped by category headers. This doesn't match the 3-column Finder pattern used elsewhere in the Backroom Product Catalog and Platform Supply Library Tab, and makes it hard to navigate large catalogs efficiently.

## Approach
Replace the flat product list with the same **Category → Product Line → Product Table** three-column Finder layout already used in `BackroomProductCatalogSection` and `SupplyLibraryTab`. Reuse the existing `BrowseColumn` component and `groupByProductLine` utility.

## Changes in `SupplyLibraryDialog.tsx`

### 1. Add state for column navigation
- Add `selectedCategory` and `selectedLine` state variables (both `string | null`)
- Reset them when brand changes or user goes back

### 2. Build category and product line column data
- Compute `categoryItems: BrowseColumnItem[]` from `brandProducts` grouped by category, with product counts
- Compute `productLineItems: BrowseColumnItem[]` using `groupByProductLine()` from `supply-line-parser` for the selected category's products
- Compute `displayProducts` — the final filtered product list for Column 3

### 3. Replace flat product list with 3-column Finder
Replace the current `ScrollArea` containing product cards (lines ~551–665) with:

- A `div` with `flex min-h-[400px]` layout (matching existing Finder patterns)
- **Column 1**: `<BrowseColumn>` for Categories — `w-[180px] shrink-0`
- **Column 2**: `<BrowseColumn>` for Product Lines — `w-[200px] shrink-0`, shown when a category is selected
- **Column 3**: Product list panel — `flex-1`, shows individual products with checkboxes and size variant pills, with a "Select All" toggle at the top. Each product row shows name, depletion info, Added badge if existing, and size option buttons

### 4. Product rows in Column 3
- Simplified compact rows (not full cards) to fit the Finder density
- Checkbox for single-size products, size pills for multi-size products
- "Added" badge for products already in catalog
- Consistent with the existing selection/toggle logic (`toggleSize`, `selected` set, `isExisting` checks)

### 5. Imports
- Add `BrowseColumn` and `BrowseColumnItem` from `@/components/platform/backroom/BrowseColumn`
- Add `groupByProductLine` from `@/lib/supply-line-parser`

### What stays the same
- Brand grid (Level 0) — unchanged
- Header with breadcrumb, search, "Add Entire Brand" button — unchanged
- Footer with selection count and "Add Products" button — unchanged
- All selection logic (`toggleSize`, `toggleAllBrand`, `handleAdd`, `selected` Set) — unchanged
- Suggest brand overlay — unchanged

