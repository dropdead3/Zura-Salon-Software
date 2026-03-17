

# Fix Danger Jones Semi-Permanent: Add Missing Shade + Data Corrections

## 1. Add Missing Shade

| Shade | Swatch Hex |
|-------|-----------|
| Vertigo | #3ABFAD (teal-green from screenshot) |

Insert as `Semi-Permanent Vertigo` with `$9.22` wholesale, `100%` markup, `113g` size.

## 2. Update All Existing Semi-Permanent Products

Bulk UPDATE across all 27 active rows:
- **Container size**: `118ml` → `113g`
- **Wholesale price**: `null` → `$9.22`
- **Markup**: `0` → `100`

Also fix missing/incorrect swatch colors to match the screenshot dots:
- Dopamine → `#333333` (dark charcoal/black)
- Empire → `#2D8B2D` (green)
- Hysteria → `#6B2D6B` (berry purple)
- Pavement → `#8A8A80` (grey)
- Poolside → `#8ED8E8` (light blue)
- Simpatico → `#E8907A` (coral/peach from screenshot, current is too light)
- Ransom → `#3DAD8E` (teal-green, brighter than current)

## 3. Deactivate "Liquid Semi-Permanent"

Not in Vish inventory — set `is_active = false`.

## Summary

| Action | Scope |
|--------|-------|
| Insert missing shade (Vertigo) | 1 new row |
| Fix container size 118ml → 113g | 27 existing rows |
| Set wholesale price $9.22 | 27 existing rows |
| Set markup 100% | 27 existing rows |
| Fix missing swatch colors | 7 rows |
| Deactivate generic entry | 1 row |

All data-only changes — no code modifications needed.

