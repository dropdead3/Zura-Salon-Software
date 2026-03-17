

# Fix Danger Jones Semi-Permanent Data (Re-apply)

## Problem
All 27 active semi-permanent products still have stale data despite earlier update attempts:
- `wholesale_price`: null
- `default_markup_pct`: 0
- `size_options`: ['118ml']

## Fix

Single bulk UPDATE targeting all active Danger Jones semi-permanents:

```sql
UPDATE supply_library_products
SET wholesale_price = 9.22,
    default_markup_pct = 100,
    size_options = ARRAY['113g'],
    updated_at = now()
WHERE brand = 'Danger Jones'
  AND category = 'semi-permanent'
  AND is_active = true;
```

Then fix the 7 swatch colors (Dopamine, Empire, Hysteria, Pavement, Poolside, Simpatico, Ransom) with individual UPDATEs.

Then deactivate "Liquid Semi-Permanent" if still active.

All data-only changes via the insert tool.

