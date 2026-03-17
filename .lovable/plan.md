

# Fix Danger Jones Supply Library: 3 Data Corrections

## 1. Add Missing "Color Remover" Product

No "Color Remover" exists for Danger Jones. Insert one new row:
- **Name**: Color Remover
- **Brand**: Danger Jones
- **Category**: `color` (it's a color-adjacent chemical product)
- **Product line**: Color Remover
- **Container size**: 43 (grams, per Vish screenshot showing $4.75/43g)

**Method**: Single INSERT via the data insert tool.

## 2. Re-categorize Semi-Permanents from `color` → `semi_permanent`

27 products named `Semi-Permanent ...` plus `Liquid Semi-Permanent` are currently under `category = 'color'`. Update them to `category = 'semi_permanent'` so they appear as a distinct category in the library browser.

**Method**: Single UPDATE matching `brand = 'Danger Jones' AND name ILIKE 'Semi-Permanent%' OR name = 'Liquid Semi-Permanent'`.

**Code impact**: The `get_supply_library_brand_summaries` RPC groups by category, so the new `semi_permanent` category will automatically appear in the brand card and Finder browser — no UI code changes needed.

## 3. Clean Up Treatment Category — Remove Non-Products

4 items in `treatment`:
- **All-Purpose Apron** — not a consumable product → deactivate
- **Applicator Bottle** — not a consumable product → deactivate
- **Color Cape** — not a consumable product → deactivate
- **Epilogue Permanent Color Book** (swatch book) — not a consumable → deactivate

**Method**: UPDATE `is_active = false` for these 4 rows. This soft-deletes them from the library without losing the data.

## Summary

| Action | Scope | Method |
|--------|-------|--------|
| Insert Color Remover | 1 new row | Data insert |
| Recategorize semi-permanents | ~28 rows `color` → `semi_permanent` | Data update |
| Deactivate non-products | 4 rows in `treatment` | Data update |

All data-only changes — no schema migrations, no code changes needed.

