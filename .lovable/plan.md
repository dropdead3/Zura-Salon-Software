

# Fix: Backroom Catalog Showing Retail Products

## Problem
The query in `BackroomProductCatalogSection.tsx` (line 103–108) fetches **all** active products from the `products` table — it has no filter for `product_type` or `is_backroom_tracked`. This means retail products (Bond Repair Conditioner, Dry Shampoo, etc.) appear alongside actual backroom supplies.

## Fix — Single query change

In the query on line 105–108, add a filter so only backroom-relevant products are returned:

```typescript
.from('products')
.select('...')
.eq('organization_id', orgId!)
.eq('is_active', true)
.eq('product_type', 'Supplies')   // ← add this filter
.order('name');
```

This ensures only products inserted with `product_type: 'Supplies'` (which is what the Supply Library and batch-add flows set) appear in the backroom catalog. Retail products will remain visible only in the Retail Products settings.

## Risk Check
- The Supply Library dialog (`SupplyLibraryDialog.tsx`) and batch-add flow both insert with `product_type: 'Supplies'` — confirmed in the code.
- Existing backroom products already have this field set correctly from those insertion flows.
- The "Tracked Only" toggle still works as an additional filter within the supplies scope.

