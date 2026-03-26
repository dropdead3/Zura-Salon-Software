

## Equalize Product Catalog Across All Locations

### What It Does
Adds a button to the Product Catalog page that takes the currently selected location's tracked products (from `location_product_settings`) and replicates that exact setup — including par levels and reorder levels — to all other active locations. This ensures every location tracks the same products with the same thresholds in one click.

### Where It Lives
On the **Backroom Product Catalog** page header area, next to the location selector. A button labeled **"Sync to All Locations"** (with a `Building2` or `Copy` icon) appears only when there are 2+ active locations.

### Flow
1. Admin clicks "Sync to All Locations"
2. A confirmation dialog shows:
   - Source location name
   - Number of tracked products being synced
   - Number of target locations
   - Warning that existing tracking settings at other locations will be overwritten
   - Checkbox: "Include par levels & reorder levels" (default: checked)
3. On confirm: upserts all tracked products from the source location into every other active location's `location_product_settings`, preserving `is_tracked`, `par_level`, and `reorder_level` values
4. Success toast: "Synced 191 tracked products to 3 locations"

### Changes

| File | Change |
|------|--------|
| `src/hooks/backroom/useLocationProductSettings.ts` | Add `useSyncCatalogToAllLocations` mutation — reads source location's settings, bulk upserts to all other active locations |
| `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` | Add "Sync to All Locations" button (visible when 2+ locations) + confirmation `AlertDialog` with pre-flight summary |

### Logic Detail

The new mutation:
1. Fetches all `location_product_settings` rows where `location_id = sourceLocationId` and `is_tracked = true`
2. For each target location, generates upsert rows copying `product_id`, `is_tracked`, `par_level`, `reorder_level`
3. Batch upserts with `onConflict: 'location_id,product_id'`
4. Optionally zeroes out par/reorder levels if the admin unchecks "Include par levels"
5. Invalidates `location-product-settings`, `backroom-inventory-table`, `backroom-setup-health` queries

### Safety
- Confirmation dialog with explicit count of affected locations and products
- Only syncs tracked products (untracked products at target locations are untouched)
- Uses upsert (not delete+insert) so existing target settings are updated, not wiped

