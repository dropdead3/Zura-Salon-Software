

# Expand Remaining Partial Brands + Coverage Badge + Generic Processing Supplies

## Three workstreams

### 1. Expand 6 partial brands to full catalogs (~250 new products)

| Brand | Current | Target | Key Additions |
|-------|---------|--------|---------------|
| **Framesi** | ~26 | ~70 | Framcolor Futura: add C/R/RV/V/B tones at levels 3-9; Eclectic: add A/G/C/RV tones at levels 5-9; add High Lifts |
| **Lakme** | ~30 | ~75 | Collage: add /10 Ash, /40 Copper, /50 Mahogany, /60 Red, /46 Copper Red tones at levels 4-9; Gloss: add Ash, Gold, Violet, Copper at levels 5-9 |
| **Keune** | ~45 | ~90 | Tinta Color: add .44 Copper Copper, .6 Red, .53 Gold Mahogany, .46 Copper Red at more levels; Semi Color: add .4 Copper, .6 Red at levels 5-8; add High Lifts 1004-1006 |
| **Elgon** | ~25 | ~65 | I-Light: add /1 Ash, /4 Copper, /5 Mahogany, /6 Red, /7 Brown at levels 4-9; Moda & Styling: add A/G/C tones at levels 5-8; add correctors |
| **#mydentity** | ~50 | ~75 | Permanent: add C Copper, RV Red Violet, MB Mocha Brown at levels 3-4 and 8-10; Demi: add matching tones at levels 7-9; add additional Super Power shades |
| **Oligo** | ~24 | ~55 | Calura: add CC Copper, RR Red, VV Violet, MB Mocha series at levels 4-9; Gloss: add Ash, Gold, Copper at levels 5-8; add Calura Boosters |

### 2. Expand Generic Developer → Generic Supplies (~15 new products)

Rename brand from "Generic Developer" to **"Generic / Salon Supplies"** and add:
- Foils (pre-cut, roll)
- Mixing bowls
- Tint brushes / applicator bottles
- Clips (sectioning, butterfly)
- Processing caps
- Gloves (S/M/L)
- Neck strips
- Cotton coil

All categorized as `treatment` (the existing catch-all for non-color supplies).

### 3. Surface `catalog_coverage` badge on brand cards

In `SupplyLibraryTab.tsx` brand card grid (~line 636-655):
- Import `getBrandCoverage` from the data file
- Add a small `PlatformBadge` below the product count showing "Complete" (success variant) or "Partial" (warning variant)
- Only show for admin context (already within backroom admin)

### 4. Update `BRAND_CATALOG_COVERAGE` metadata

Mark all 6 brands as `'complete'` after expansion. Add `'Generic / Salon Supplies': 'complete'`.

### 5. Database sync

Batch-insert new products into `supply_library_products` using `WHERE NOT EXISTS` — same pattern as all previous expansions.

### Files modified
- `src/data/professional-supply-library.ts` — ~250 new product lines + coverage updates + Generic rename/expansion
- `src/components/platform/backroom/SupplyLibraryTab.tsx` — Coverage badge on brand cards (~5 lines)

