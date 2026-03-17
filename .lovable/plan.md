

## Rename Sync Buttons + Add Confirmation Dialog

### Changes to `BackroomProductCatalogSection.tsx`

1. **Rename both sync buttons**:
   - "Sync from Library" → "Sync from Zura Library" (line 695, per-brand button)
   - "Sync All Brands" → "Sync from Zura Library" (line 707, catalog-level button)

2. **Add confirmation dialog** using the existing `AlertDialog` component:
   - State: `syncConfirmOpen` boolean + `syncScope` to track whether it's a single-brand or all-brands sync
   - Dialog explains what the sync does: pulls wholesale pricing, markup percentages, swatches, and container sizes from the Zura Library for products that don't already have overrides
   - "Are you sure?" style with Cancel and Confirm buttons
   - On confirm, triggers the appropriate mutation (`syncFromLibraryMutation` or `syncAllBrandsMutation`)

3. **Dialog copy**:
   - Title: "Sync from Zura Library"
   - Description: "This will update all products missing pricing, markup, or swatch data with values from the Zura Library. Any overrides you've already made will be preserved."
   - Buttons: "Cancel" / "Yes, sync now"

