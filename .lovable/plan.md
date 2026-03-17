

# Fix Supply Library Product Duplications

## Problem
There are **1,490 duplicate product entries** (same brand + name) in `supply_library_products`. Duplicates are created because there's no database-level uniqueness constraint and several insertion paths lack dedup.

## Root Cause — 4 Insertion Points Without Protection

| Entry Point | File | Issue |
|---|---|---|
| **Seed** | `useSupplyLibrary.ts` `useSeedSupplyLibrary` | No dedup at all — blindly inserts static data |
| **Sync** | `useSupplyLibrary.ts` `useSyncSupplyLibrary` | Client-side dedup via Set, but case-sensitive (`brand::name`) — misses case variants |
| **CSV Import** | `CSVImportDialog.tsx` | No dedup — raw insert |
| **Manual Add** | `SupplyLibraryTab.tsx` `handleSave` | No dedup check before insert |
| **Bulk Catalog Import** | Edge function `bulk-catalog-import` | Case-insensitive dedup exists but only checks `is_active = true` rows |

## Fix — Two-Part Approach

### 1. Database: Add unique constraint + cleanup migration

**Step A — Remove existing duplicates** (keep the row with the most data filled in, or the newest):
```sql
DELETE FROM supply_library_products
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY lower(brand), lower(name)
      ORDER BY
        (CASE WHEN wholesale_price IS NOT NULL THEN 1 ELSE 0 END
         + CASE WHEN swatch_color IS NOT NULL THEN 1 ELSE 0 END) DESC,
        created_at DESC
    ) as rn
    FROM supply_library_products
    WHERE is_active = true
  ) ranked WHERE rn > 1
);
```

**Step B — Add a unique index** on `(lower(brand), lower(name))` for active products:
```sql
CREATE UNIQUE INDEX idx_supply_lib_unique_brand_name
  ON supply_library_products (lower(brand), lower(name))
  WHERE is_active = true;
```

This partial unique index prevents future duplicates at the DB level while still allowing soft-deleted (`is_active = false`) rows.

### 2. Code: Add dedup guards to all insertion paths

**`useSeedSupplyLibrary`** — Add a pre-check: fetch existing `(brand, name)` pairs and skip already-existing entries (same pattern as sync).

**`useSyncSupplyLibrary`** — Make the existing Set comparison case-insensitive by lowercasing the key: `${p.brand}::${p.name}`.toLowerCase()`.

**`CSVImportDialog.tsx`** — Before inserting, fetch existing `(brand, name)` pairs for the brands in the CSV and filter out duplicates.

**`SupplyLibraryTab.tsx` manual add** — Before inserting a new product, query for an existing active product with the same `brand + name` (case-insensitive). Show a toast error if duplicate found.

**`bulk-catalog-import` edge function** — Already has dedup but uses `is_active = true` filter. This is fine since the unique index also scopes to active rows. No changes needed here.

### Technical Details

- The unique index uses `lower()` expressions to make matching case-insensitive
- The `WHERE is_active = true` partial index means deactivated products don't block re-adding a product
- The cleanup migration ranks duplicates by data completeness (price + swatch filled) then recency, keeping the best row
- All client-side dedup is a safety net; the DB constraint is the real guard

