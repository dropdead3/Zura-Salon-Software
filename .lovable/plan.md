

## Remove Brand from Catalog

### What It Does
Adds a **"Remove Brand"** button to the brand detail header (next to "Sync from Zura Library") that removes the selected brand's products from the salon's catalog and untracking them across all locations. This is for when a salon decides to stop carrying a product line entirely.

### Safety
- **Two-step confirmation dialog** with:
  - Brand name displayed prominently
  - Count of products to be removed and locations affected
  - Explanation: "This will deactivate all {brand} products and remove tracking from all locations. Stock movement history will be preserved."
  - Destructive button styling ("Remove {brand}")

### What Happens on Confirm
1. **Delete `location_product_settings`** rows for all products of this brand across all locations in the org
2. **Set `is_active = false`** on all products in the `products` table matching the brand + org (soft delete — preserves history)
3. **Navigate back** to the brand grid (clear `selectedBrand`)
4. **Invalidate** `backroom-product-catalog`, `location-product-settings`, `backroom-inventory-table`, `backroom-setup-health`, `product-brands` queries

### Changes

| File | Action |
|------|--------|
| `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` | Add a `useRemoveBrandFromCatalog` mutation + "Remove Brand" button (Trash2 icon) in the brand detail header + AlertDialog with destructive confirmation |

### Implementation Detail
- New inline mutation `removeBrandMutation` that:
  1. Fetches product IDs for the brand: `SELECT id FROM products WHERE organization_id = ? AND brand ILIKE ? AND is_active = true AND product_type = 'Supplies'`
  2. Deletes from `location_product_settings` using `.in('product_id', ids)`
  3. Sets `is_active = false` on those products
- Button placed after "Sync from Zura Library", using `variant="ghost"` with `text-destructive` styling
- Confirmation dialog shows: product count, location count, and a warning that this is irreversible from the catalog view

