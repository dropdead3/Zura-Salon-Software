

# Move Color Remover to its Own Category

## Problem
The single "Color Remover" product is currently under the **Color** category as a product line. It's not a color product and should be its own category.

## Fix
One database UPDATE — move the Color Remover product from `category = 'color'` to `category = 'color-remover'` and clear its product_line:

```sql
UPDATE supply_library_products
SET category = 'color-remover',
    product_line = NULL,
    updated_at = now()
WHERE brand = 'Danger Jones'
  AND category = 'color'
  AND product_line = 'Color Remover'
  AND is_active = true;
```

After this, Color will show 2 product lines (Epilogue Permanent: 86, Semi-Permanent: 27) and Color Remover will appear as a separate category with 1 product.

## Frontend
Add `'color-remover'` label to `SUPPLY_CATEGORY_LABELS` in `src/data/professional-supply-library.ts` so it displays as "Color Remover" in the Finder UI.

No other changes needed — the three-column browser dynamically renders categories from the data.

