

# Delete Brand & Catalog Feature

## Changes

### 1. New `useDeleteSupplyBrand` hook in `src/hooks/platform/useSupplyLibraryBrandMeta.ts`
- Soft-delete all `supply_library_products` where `brand = brandName` (set `is_active = false`)
- Soft-delete the `supply_library_brands` meta row if it exists (set `is_active = false`)
- Invalidate all supply-library query keys on success
- Toast confirmation with product count

### 2. UI in `src/components/platform/backroom/SupplyLibraryTab.tsx`
- Add a **Trash2 icon button** next to the existing Pencil (edit) button in the brand detail header (around line 689-695)
- Wire it to open an `AlertDialog` confirmation with destructive styling
- Confirmation text: "This will remove **{brand}** and all **{count}** products from the supply library. This cannot be undone."
- On confirm: call the delete mutation, then navigate back to brand list (`setSelectedBrand(null)`)
- Add `deleteBrandOpen` state boolean
- Show loading spinner on the confirm button during deletion

