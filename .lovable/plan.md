
## Backfill Org Products from Supply Library Data

### Problem
All 250 org products have null `cost_price`, `markup_pct`, `swatch_color`, and `container_size` because they were added before the pre-population code was implemented. The Platform Supply Library has complete data (wholesale prices, markups, swatches, sizes) for 246 of these 250 products.

### Plan

#### 1. Database migration — bulk backfill from supply library
Run a single UPDATE statement that joins `products` to `supply_library_products` by brand + name prefix matching (org products have "Name — Size" format, library has just "Name"). This backfills `cost_price`, `markup_pct`, `swatch_color`, and `container_size` for all existing products in one shot.

```sql
UPDATE products p
SET
  cost_price   = COALESCE(p.cost_price, slp.wholesale_price),
  markup_pct   = COALESCE(p.markup_pct, slp.default_markup_pct),
  swatch_color = COALESCE(p.swatch_color, slp.swatch_color),
  container_size = COALESCE(p.container_size, slp.size_options[1]),
  updated_at   = now()
FROM supply_library_products slp
WHERE lower(p.brand) = lower(slp.brand)
  AND lower(p.name) LIKE lower(slp.name) || '%'
  AND slp.is_active = true
  AND p.is_active = true
  AND p.product_type = 'Supplies'
  AND (p.cost_price IS NULL OR p.swatch_color IS NULL);
```

This uses `COALESCE` so it only fills in missing values — any org-level overrides already set by users are preserved.

#### 2. Add a "Sync from Library" button in the catalog UI
In `BackroomProductCatalogSection.tsx`, add a button (next to the existing "Set Pricing" button in the brand detail header) that triggers a targeted sync for the selected brand. This calls a mutation that runs the same join-and-update logic for a single brand, letting org users pull in library updates on demand.

#### 3. Runtime fallback enrichment for display
In the `displayProducts` memo, enrich each product with library data as a visual fallback — if `cost_price` is null, look up the matching `libraryItems` entry and show its `wholesalePrice` as a ghost value (dimmed, with a "from library" indicator). This ensures the catalog always looks populated even if new products haven't been synced yet.

### Technical details

- The name matching uses `lower(p.name) LIKE lower(slp.name) || '%'` which handles the "Name — Size" suffix pattern (verified: 246/250 match)
- Migration is idempotent via `COALESCE` — safe to run multiple times
- The "Sync from Library" mutation will use the same pattern scoped to `p.brand = selectedBrand`
- Ghost values in display will use a `text-muted-foreground/50 italic` style to distinguish from actual org overrides
