

# Align Org Supply Library with Platform Supply Library Structure

## What You're Asking
The organization-level "Backroom Product Catalog" (`BackroomProductCatalogSection`) should mirror the Platform Supply Library's layout and structure — brand cards → 3-column finder with product table — but **without** platform-admin features (Sync Library, Import CSV, Export, Add Product, Add Brand, Build Full Catalog).

## Current State
- **Platform** (`SupplyLibraryTab`): Brand card grid → 3-column `ColumnBrowser` (Categories → Product Lines → Product Table) with full product table columns (Swatch, Name, Category, Depletion, Unit, Wholesale, Markup, Retail, Sizes, Actions). Uses Platform UI primitives. Has data health legend, stats bar, inline editing, swatch picker.
- **Org-level** (`BackroomProductCatalogSection`): Similar brand card grid → `BrandFinder` 3-column browser, but Column 3 renders compact `FinderProductRow` cards with toggle/pricing/switches inline, not a proper table. Missing: data health legend, filter bar (search/pricing/recency), stats footer, table-based product display, swatch support.

## Plan

### File: `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx`

**1. Replace `BrandFinder` Column 3 with a proper product table**
- Replace `FinderProductRow` card rows with a table matching the platform's columns: **Swatch | Name | Category | Depletion | Unit | Wholesale | Markup | Retail | Sizes** (read-only, no Actions column — no edit/delete since those are platform admin features)
- Keep the tracking Toggle and "Track All" switches on Category and Product Line headers (org-specific feature)
- Import shade sorting utilities (`sortByShadeLevel`, `SHADE_SORTED_CATEGORIES`) for correct product ordering

**2. Add filter bar above the column browser (matching platform)**
- Search input for filtering products within the selected brand
- Pricing filter dropdown (All / Missing Price / Priced)
- Data health legend above the browser (Complete / Some missing / Most missing dots)

**3. Add stats footer below the browser**
- Total products count, in-scope count, missing price/swatch counts (matching platform layout)

**4. Update brand card grid to match platform cards**
- Add "Missing Data" badge for incomplete brands (matching platform's health badge)
- Show category summary at bottom of cards (matching platform's `categorySummary` display)

**5. Adjust Column 3 header to match platform**
- Show scope label (category › product line) with count badge
- Add "Set Pricing" button scoped to displayed products (this is org-level, not platform admin)

**6. Remove platform-only features from org view**
- No "Supply Library" button in header (already opens platform dialog)
- No Sync/Import/Export/Add Product buttons
- No inline editing of category/depletion/unit/wholesale (read-only display; org manages tracking only)
- No swatch picker editing (read-only swatch display from platform data)

**7. Update data source for product table columns**
- The org `products` table already has `cost_price`, `markup_pct`, `container_size`, `unit_of_measure`
- Map these to match platform column names: wholesale → `cost_price`, markup → `markup_pct`, retail → computed, sizes → `container_size`

### No new files needed
All changes are within `BackroomProductCatalogSection.tsx`, reusing existing `BrowseColumn` component and adding a table renderer similar to the platform's `renderProductTable`.

### No database changes needed
The org `products` table already has all required columns.

