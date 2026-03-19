

# Retail Product Inventory & Reorder Manager — Foundation Build

## Status: Phase 1 Complete ✅

### What was built
1. **`retail_product_settings` table** — per-location par/reorder levels for retail products, with RLS policies scoped to org members
2. **Backroom filter fix** — `useUnlinkedProducts` and `useAllProductsWithSupplier` now filter to `product_type = 'Supplies'` only
3. **Retail inventory tab filter** — `InventoryByLocationTab` excludes Supplies from the retail inventory view
4. **Hooks created**:
   - `src/hooks/retail/useRetailProductSettings.ts` — CRUD for `retail_product_settings` (per-location par/reorder levels)
   - `src/hooks/retail/useRetailReorderQueue.ts` — joins products + settings to surface items below reorder level

### Phase 2 (Future)
- Wire `useRetailProductSettingsMap` into `InventoryByLocationTab` for inline par/reorder editing
- Dedicated reorder queue UI component using `useRetailReorderQueue`
- Separate nav entry when retail inventory grows in complexity
