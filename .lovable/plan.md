

# Redesign Supply Library: Brand Cards → Category-Grouped Products

Replace the current flat table view with a two-level browsing experience inspired by the reference screenshots.

## Level 1: Brand Card Grid

When no brand is selected, show a responsive grid of brand cards (similar to the "Select a manufacturer" screenshot). Each card displays:
- Brand name (prominent, centered)
- Product count badge
- Category summary (e.g. "42 Color · 8 Developer · 3 Lightener")

Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`. Cards use `PlatformCard variant="interactive"` with click handler.

Search input at top filters brands by name. The existing Export/Import CSV/Add Product buttons remain in the header.

## Level 2: Brand Detail — Products by Category

Clicking a brand card sets `selectedBrand` state. The view transitions to:

1. **Breadcrumb header**: "Supply Library / {Brand}" with a back arrow (`ChevronLeft`) to return to brand grid
2. **Search bar** for filtering products within the brand
3. **Category sections**: Products grouped by category (Color, Developer, Lightener, etc.), each as a collapsible section with:
   - Category header with label + product count + expand/collapse toggle
   - Product table underneath (same columns: Name, Category badge, Depletion, Unit, Sizes, Actions)
   - All sections expanded by default

## State Changes

- Add `selectedBrand: string | null` state (null = brand grid, string = detail view)
- Remove the brand dropdown filter (replaced by card navigation)
- Keep category dropdown filter in detail view for quick filtering within a brand
- Keep pagination within each category or for the full brand view

## File Changes

**`src/components/platform/backroom/SupplyLibraryTab.tsx`** — single file change:
- Add `selectedBrand` state
- Extract brand grid view (when `selectedBrand === null`)
- Extract brand detail view (when `selectedBrand` is set)
- Compute brand summaries from `allProducts` (group by brand → count + category breakdown)
- Reuse existing table row rendering, inline editing, delete, and Add/Edit dialog logic unchanged

No database, hook, or data file changes needed. The `useSupplyLibraryProducts` hook already supports `brand` filtering.

