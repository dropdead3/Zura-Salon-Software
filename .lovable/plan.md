

# Add Entire Brand to Catalog — One-Click

## Current State
Both the inline brand browser and the Supply Library Dialog already have "Select All" + "Add Selected" flows. But users must: click a brand → click "Select All" → click "Add X Products". There's no way to add an entire brand directly from the brand list without drilling in first.

## Plan

### 1. Add "Add All" button on brand chips (inline catalog view)
In `BackroomProductCatalogSection.tsx`, when the alphabet letter is selected and brand chips are shown (lines 394–425), add a small "+" or "Add All" icon-button on each brand chip that isn't fully added. Clicking it immediately inserts all products for that brand (all sizes) into the catalog without needing to drill in.

- Add a new `handleAddEntireBrand(brand: string)` function that:
  - Gets all products via `getProductsByBrand(brand)`
  - Filters out already-existing products using `isExisting()`
  - Builds the insert array (same shape as `handleAddFromBrand`)
  - Inserts into `products` table
  - Shows confirmation toast with count
  - Invalidates queries

- Add a small icon button (e.g., `Plus` or `PackagePlus`) next to each brand chip, with a confirmation step (either a simple confirm or immediate action with undo toast)

### 2. Add "Add Entire Brand" button in brand browsing header
In the brand browsing view header (line 518–538), alongside the existing "Select All" button, add an "Add Entire Brand" button that directly inserts all non-existing products without requiring selection first. This is a convenience shortcut that combines Select All + Add.

### 3. Add "Add Entire Brand" in Supply Library Dialog
In `SupplyLibraryDialog.tsx`, add an "Add Entire Brand" button in the brand product header (line 351–371) next to the existing "Select All" button. This performs the insert directly.

### 4. Files Changed
- `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` — Add `handleAddEntireBrand()`, add button on brand chips and brand browsing header
- `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx` — Add "Add Entire Brand" button in dialog product header

### 5. UX Details
- Brand chips: Show a small `PackagePlus` icon on hover (hidden if brand fully added)
- Confirmation: Use a toast with count ("Added 55 Danger Jones products to your catalog")
- Loading state: Disable button and show spinner during insert
- Already-added brands: Button hidden or disabled with checkmark

