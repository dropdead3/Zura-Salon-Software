

# Supply Library: Command-Center Column Browser — Enhanced Plan

## Core Refactor (Already Approved)

Replace the Level 2 collapsible drill-down with a **three-column Finder-style browser** when viewing a brand:

- **Column 1** (~200px): Categories with counts, active highlight
- **Column 2** (~220px): Product lines within selected category, counts
- **Column 3** (flex-1): Product table with reordered columns
- **Mobile**: Single-column drill-down with back arrow
- **Stats bar**: Total products, missing prices, missing swatches at current scope

## Additional Enhancements to Include

### 1. Keyboard navigation
- Arrow up/down to move selection within a column
- Arrow right to drill into the next column
- Arrow left to go back one column
- `Escape` to clear selection and go up one level
- This is a major differentiator from Vish — power users can browse the entire catalog without touching the mouse

### 2. Bulk pricing dialog (scope-aware)
- "Set Pricing" button appears in Column 3 header, scoped to whatever is currently selected (category or product line)
- Opens a dialog: wholesale price per unit, markup %, auto-calculates retail
- Applies to all visible products in one batch update
- Reuse the existing inline price save pattern but batched

### 3. Data health indicators per column item
- Each category and product line row shows a small colored dot:
  - Green: all products have prices and swatches
  - Amber: some missing
  - Red: majority missing
- This lets admins quickly scan which areas need attention without clicking into each one

### 4. Quick search within columns
- Each column gets an inline filter input when it has 8+ items
- Filters the list in that column only (e.g., type "nat" in Column 2 to find "Naturals")
- Lightweight — just a `useState` filter, no API calls

### 5. Sticky column headers with counts
- Each column header shows: "Categories (7)" / "Product Lines (12)" / "Products (32)"
- Stays pinned as the column scrolls

### 6. Extract `BrowseColumn` as reusable component
- `src/components/platform/backroom/BrowseColumn.tsx` — scrollable list with name, count badge, health dot, active state, optional search
- Used three times in the layout with different data sources
- Could be reused elsewhere in the platform (e.g., hardware catalog)

## Files Changed

| File | Change |
|------|--------|
| `src/components/platform/backroom/SupplyLibraryTab.tsx` | Replace Level 2 collapsible layout (lines ~998-1104) with column browser; add `selectedCategory`/`selectedProductLine` state; reorder table columns to Swatch → Name → Cost/g → Markup → Retail → Container → Depletion → Actions; add stats bar; wire keyboard nav |
| `src/components/platform/backroom/BrowseColumn.tsx` | **New** — Reusable column component with scroll, search, health dots, active state |
| `src/components/platform/backroom/BulkPricingDialog.tsx` | **New** — Scope-aware bulk pricing dialog (wholesale + markup → retail) |

## What Stays Unchanged

- Level 1 brand card grid + A-Z nav
- All existing dialogs (add product, edit product, delete, CSV import, add brand, edit brand, bulk catalog import)
- Inline editing within the product table
- Swatch picker + auto-assign + re-analyze
- localStorage collapse state (repurposed for column selection memory)
- All hooks, queries, and data fetching

