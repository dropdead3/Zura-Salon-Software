

# Redesign Org Supply Library to Match Platform Brand Card Pattern

## Current State
The org-side "Supply Library" is a dialog (`SupplyLibraryDialog`) with a sidebar brand list + product checklist. It works but doesn't match the platform-side visual pattern (brand card grid with A-Z nav, category summaries, product counts).

## Goal
Organizations browse the supply library using the same brand-card-grid → product-selection flow as the platform side. They pick which brands they use, then select which products to carry.

## Design

### Phase 1: Replace SupplyLibraryDialog internals

**Keep it as a full-screen dialog** (max-w-5xl) but replace the sidebar layout with:

1. **Level 0 — Brand Card Grid** (matches platform pattern):
   - Search bar + A-Z alphabet navigation
   - Brand cards in a responsive grid (2-4 cols) showing: logo, brand name, product count from the supply library, and a badge if the org already carries some products from that brand (e.g., "12/77 added")
   - Click a brand → drill into Level 1

2. **Level 1 — Product Selection for a Brand**:
   - Breadcrumb back to brand grid
   - "Add Entire Brand" button in header
   - Products grouped by category with checkboxes
   - Size chip selectors (existing pattern works well — keep it)
   - Products already in the org catalog shown as "Added" (greyed, no checkbox)
   - Sticky footer with selection count + "Add Products" button

### Technical approach

**Single file change: `SupplyLibraryDialog.tsx`**

- Replace the `flex` two-panel layout (ScrollArea sidebar + ScrollArea products) with a single content area that conditionally renders the brand grid or the product list based on `selectedBrand` state
- Reuse the existing brand data from `useSupplyLibraryItems()` — group by brand to build card data (product count, category summary)
- Brand cards styled with standard org-side tokens (rounded-xl border bg-card/50, not platform tokens)
- A-Z bar uses same pattern as `BackroomProductCatalogSection` (already exists there)
- Keep existing `handleAdd`, `handleAddEntireBrand`, selection state, suggest-brand flow
- Widen dialog to `max-w-5xl` and increase height to `max-h-[85vh]`

### What stays the same
- All insertion logic (handleAdd, handleAddEntireBrand)
- Size chip selection pattern
- "Missing a brand?" suggestion flow (move to bottom of brand grid)
- Footer with selection count + Add button
- Existing products detection (existingKeys)

### What changes
- Dialog width: `max-w-3xl` → `max-w-5xl`
- Layout: sidebar+panel → single area with brand grid ↔ product list toggle
- Brand display: text list → visual cards with logo, count, category summary, "X added" badge
- Add breadcrumb nav when viewing a brand's products
- Brand logos pulled from `supply_library_brands` table (same as platform side uses `brandLogoMap`)

### Data additions
- Fetch brand logos: query `supply_library_brands` for `brand_name, logo_url` to populate cards (small addition to the component or a lightweight hook)
- Group `libraryItems` by brand to compute category summaries for each card

