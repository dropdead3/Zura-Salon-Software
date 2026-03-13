

# Combined Brand Browsing + Product Search in Backroom Catalog

## Overview
Keep the existing Supply Library dialog and its brand-first browsing flow, but **also add a brand chips bar directly into the main catalog section**. Users get both:
1. **Inline brand browsing** — horizontal scrollable brand chips above the product list; selecting a brand shows its Supply Library products inline with add checkboxes
2. **Product search** — the existing search/filter bar works across both tracked catalog products and (when a brand is active) that brand's library products

## Layout

```text
┌──────────────────────────────────────────────────┐
│ BACKROOM PRODUCT CATALOG           [0 tracked]   │
│ Toggle products for backroom tracking...          │
├──────────────────────────────────────────────────┤
│ [🔍 Search products...]                          │
│ [My Catalog ✓] [Schwarzkopf] [Wella] [Redken] → │
├──────────────────────────────────────────────────┤
│  (when "My Catalog" active → existing rows)      │
│  (when brand active → supply library products    │
│   with checkboxes, sizes, "Add to Catalog" btn)  │
└──────────────────────────────────────────────────┘
```

## Changes

### `BackroomProductCatalogSection.tsx`

1. **Add state**: `activeBrand: string | null` (null = "My Catalog"), `selectedItems: Set<string>` for pending adds
2. **Brand chips bar**: Import `getSupplyBrands`, render horizontal scrollable row of brand chips below the search input. First chip is "My Catalog" (always shown). Brand chips show product count badges.
3. **Dual view rendering**:
   - `activeBrand === null` → current tracked product list with filters and depletion controls (existing behavior)
   - `activeBrand === "SomeBrand"` → show that brand's Supply Library products with checkboxes + size chips (reuse logic from `SupplyLibraryDialog`)
4. **Search**: When brand is active, filter that brand's supply library items. When "My Catalog" is active, filter tracked products (current behavior).
5. **Sticky add footer**: When `selectedItems.size > 0` and a brand is active, show an "Add X Products" button at the bottom (same insert logic as `SupplyLibraryDialog.handleAdd`)
6. **Keep the Supply Library button** in the header as an alternative full-dialog experience
7. **"Suggest Missing Brand"** link at the end of the brand chips row

### `SupplyLibraryDialog.tsx`
No changes — kept as-is for the full-dialog experience.

### No database changes needed.

