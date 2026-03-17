

# Edit Brand Name & Logo

## Changes

### 1. New `useUpdateSupplyBrand` mutation in `useSupplyLibraryBrandMeta.ts`
- Updates `supply_library_brands` row (name, logo_url) by brand id
- When name changes, also updates the `brand` text column on all `supply_library_products` rows with matching `brand_id` to keep them in sync
- Invalidates brand-meta, brands, and products query caches

### 2. New `EditBrandDialog.tsx` component
A small dialog with:
- Brand name text input (pre-filled, with duplicate-name validation)
- Logo uploader (reusing the drag-and-drop pattern from `AddBrandWizard` Step 2 — upload to `brand-logos` bucket, show preview, allow remove)
- Save / Cancel buttons

### 3. Edit button in Level 2 brand header (`SupplyLibraryTab.tsx`)
- Add a pencil/edit icon button next to the brand name in the breadcrumb header (line ~618) that opens `EditBrandDialog`
- Pass current brand name and logo URL from `brandLogoMap`
- On save, also update `selectedBrand` state if the name changed

### Files
- **Modified:** `src/hooks/platform/useSupplyLibraryBrandMeta.ts` — add `useUpdateSupplyBrand` mutation
- **Created:** `src/components/platform/backroom/EditBrandDialog.tsx` — edit dialog
- **Modified:** `src/components/platform/backroom/SupplyLibraryTab.tsx` — add edit trigger button + state

