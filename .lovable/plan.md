

# Consolidate Semi-Permanent into Color Category

## Current State
- **Color category**: 87 products (86 Epilogue permanents + 1 Color Remover, all with `product_line = NULL`)
- **Semi-Permanent category**: 27 products (5 with `product_line = 'Semi-Permanent'`, 22 with NULL)

## Changes

### Database (2 UPDATEs)

1. **Move all semi-permanents into color category and set product line**:
```sql
UPDATE supply_library_products
SET category = 'color',
    product_line = 'Semi-Permanent',
    updated_at = now()
WHERE brand = 'Danger Jones'
  AND category = 'semi-permanent'
  AND is_active = true;
```

2. **Set product line on existing Epilogue permanents**:
```sql
UPDATE supply_library_products
SET product_line = 'Epilogue Permanent',
    updated_at = now()
WHERE brand = 'Danger Jones'
  AND category = 'color'
  AND is_active = true
  AND name ILIKE '%epilogue%'
  AND product_line IS NULL;
```

After this, the Color category will have 3 product lines: **Epilogue Permanent** (86), **Semi-Permanent** (27), and **Color Remover** (1).

### No Frontend Changes Needed
- `semi-permanent` is already in `SHADE_SORTED_CATEGORIES`, but swatches are triggered by category. Since these products move to `color` (already swatch-enabled), swatches will continue to display.
- The three-column Finder UI already groups by `product_line`, so the new lines will appear automatically.

