

# Fix Danger Jones Gloss Toner: Add 21 Missing Shades + Data Corrections

## 1. Insert 21 Missing Gloss Toner Shades

All new rows follow existing naming convention (`Gloss Toner [shade] [tone name]`), category `toner`, size `57g`, wholesale $7.50, markup 100%.

| Shade | Swatch Color |
|-------|-------------|
| 1-1 Ash | #1A1A2E |
| 3-2 Violet | #2E1A2E |
| 3-8 Brown | #2B1810 |
| 3-65 Red/Mahogany | #4A1020 |
| 4-2 Violet | #3E2A3E |
| 4-4 Copper | #6B3510 |
| 4-66 Red/Red | #6B1020 |
| 5-3 Gold | #7A6020 |
| 5-52 Mahogany/Violet | #6B3050 |
| 5-65 Red/Mahogany | #7A2030 |
| 6-2 Violet | #6B5070 |
| 6-7 Matte | #6B6B4A |
| 6-34 Gold/Copper | #8B6030 |
| 6-46 Copper/Red | #8B3020 |
| 6-52 Mahogany/Violet | #7B3858 |
| 6-66 Red/Red | #8B1525 |
| 7-66 Red/Red | #A01828 |
| 8-7 Matte | #A0A070 |
| 8-34 Gold/Copper | #C09040 |
| 8-46 Copper/Red | #C06030 |
| 9-03 Natural/Gold | #D4C090 |

**Method**: Single batch INSERT of 21 rows into `supply_library_products`.

## 2. Update Existing Gloss Toner Data

Two corrections across all 45 existing Gloss Toner rows:
- **Container size**: `60ml` → `57g` (matches Vish data)
- **Wholesale price**: `null` → `$7.50`
- **Default markup**: Set to `100` (so retail auto-calculates to $15.00)

**Method**: Single UPDATE statement filtering on `brand = 'Danger Jones' AND category = 'toner'`.

## Summary

| Action | Scope |
|--------|-------|
| Insert missing shades | 21 new rows |
| Fix container size 60ml → 57g | 45 existing rows |
| Set wholesale price $7.50 | 45 existing rows |
| Set markup 100% | 45 existing rows |

All data-only changes — no code modifications needed.

