

## Why Duplicates Exist

The duplicates are **not exact name matches** — the unique index `(organization_id, lower(brand), lower(name))` is working correctly. The issue is that the same physical product was imported twice with different size suffixes in the name:

- `Semi-Permanent Adrenaline (Neon Green) — 118ml` (older import)
- `Semi-Permanent Adrenaline (Neon Green) — 113g` (newer import)

Both have identical `container_size: 113g`. There are **55 such pairs** across the catalog. They look identical in the table because we now strip the size suffix from the display name.

## Plan

### 1. One-time data cleanup migration

Write a migration that deduplicates these pairs:
- Group active products by `(organization_id, brand, regexp_replace(name, size_suffix_pattern, ''))` where count > 1
- Keep the **newer** record (which has the corrected gram-based name) and soft-delete the older one (`is_active = false`)
- Before deleting, merge any tracking state: if either record has `is_backroom_tracked = true`, keep it on the survivor
- Transfer any `stock_movements` or `inventory_projections` referencing the deleted product to the surviving one

### 2. Strengthen the unique index

Replace the current name-based unique index with one that strips the size suffix before comparison, preventing future size-variant duplicates:

```sql
CREATE UNIQUE INDEX idx_products_org_brand_basename_unique
  ON public.products (
    organization_id,
    lower(brand),
    lower(regexp_replace(name, '\s*[—–-]\s*\d+\.?\d*\s*(g|ml|oz|L|l)\s*$', ''))
  )
  WHERE is_active = true;
```

Drop the old index after creating this one.

### 3. Update import/sync logic to normalize names

In the catalog sync and product creation flows, normalize the product name to always use the gram-based suffix (matching `container_size`) before insertion. This ensures the unique index catches any future attempts.

### Technical details

- Migration file: new SQL migration
- Affected tables: `products`, `stock_movements`, `inventory_projections`
- The cleanup query will use `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY created_at DESC)` to pick the survivor
- The strengthened index uses a functional expression on `regexp_replace` to normalize before uniqueness check

