
-- Step A: Remove duplicate active supply_library_products, keeping the best row per (brand, name)
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

-- Step B: Add partial unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_supply_lib_unique_brand_name
  ON supply_library_products (lower(brand), lower(name))
  WHERE is_active = true;
