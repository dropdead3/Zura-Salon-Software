

## Per-Location Backroom Product Tracking

### Current State
- The `products` table is org-scoped with a nullable `location_id` column
- `is_backroom_tracked` is a single boolean on the product row — no per-location granularity
- `inventory_projections` and `stock_movements` already support `location_id`
- The backroom catalog UI has no location picker

### Architecture Decision

Since you want **fully separate product lists per location** with **per-location inventory**, we need a junction table that decouples "which products exist in the org catalog" from "which products are tracked/stocked at each location."

### Database Changes

**New table: `location_product_settings`**

```text
location_product_settings
├── id (UUID, PK)
├── organization_id (UUID, FK → organizations, NOT NULL)
├── location_id (UUID, FK → locations, NOT NULL)
├── product_id (UUID, FK → products, NOT NULL)
├── is_tracked (BOOLEAN, default false)
├── par_level (NUMERIC, nullable)
├── reorder_level (NUMERIC, nullable)
├── created_at / updated_at
└── UNIQUE(location_id, product_id)
```

RLS: `is_org_member(auth.uid(), organization_id)` for read, `is_org_admin` for write.

### UI Changes

1. **Location picker in Backroom Product Catalog header** — Add a `LocationSelect` dropdown next to the view toggle. Defaults to first location (or "All Locations" for a read-only aggregate view).

2. **Brand cards** — Product counts and "tracked" counts become location-scoped. When a location is selected, the count reflects only that location's tracked products.

3. **Track All / individual tracking toggles** — Write to `location_product_settings` instead of the product-level `is_backroom_tracked` boolean. The org-level boolean becomes a derived "tracked anywhere" flag.

4. **Inventory table view** — Already supports `location_id` filtering via `inventory_projections`. Wire the location picker into the query.

5. **Stats cards (Tracked / In Stock / To Reorder)** — Filter by selected location.

### Hook Changes

- **`useBackroomInventoryTable`** — Accept `locationId` param, join against `location_product_settings` instead of `is_backroom_tracked`.
- **`BackroomProductCatalogSection` query** — Join or filter with `location_product_settings` for the selected location.
- **`useBackroomSetupHealth`** — Aggregate across locations or scope to selected location.
- **Bulk track mutation** — Upsert into `location_product_settings` instead of updating `products.is_backroom_tracked`.

### What Stays Org-Wide
- Product catalog (name, brand, SKU, pricing, swatch, depletion method)
- Services, recipes, and allowance policies (per your preference)
- Supply Library sync

### Migration Path
- Backfill `location_product_settings` from existing `products.is_backroom_tracked = true` rows, assigning them to all active locations in the org
- Keep `products.is_backroom_tracked` as a derived/cached field for backward compat

