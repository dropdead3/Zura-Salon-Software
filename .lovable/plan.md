

# Expand Danger Jones Catalog to Full Product Count

## Problem
We have 56 Danger Jones products in the library. The actual catalog has ~178 products. The gap comes from three areas:

1. **Epilogue Permanent Color**: We have 1 collapsed entry representing 84 individual shades
2. **Gloss Toner with Bonder**: We have 20 shades but the full line has 56 (confirmed by Danger Jones official FAQ)
3. **Missing product lines**: Cream Lightener, accessories, haircare, and Epilogue Boosters are absent

## Data Sourced

From retailer sites (Beauty Ship To You, SleekShop, CosmoProf, Salon Cosmetics AU), I've compiled:

**Epilogue Permanent Color — 84 shades (60ml):**
- Levels 1-5 (42 shades): 1-0 Natural, 1-1 Ash, 3-0 Natural, 3-2 Violet, 3-65 Red Mahogany, 4-0 Natural, 4-00 Double Natural, 4-3 Gold, 4-52 Mahogany Violet, 4-65 Red Mahogany, 4-66 Red Red, 4-8 Brown, 5-0 Natural, 5-00 Double Natural, 5-01 Natural Ash, 5-1 Ash, 5-2 Violet, 5-3 Gold, 5-34 Gold Copper, 5-46 Copper Red, 5-52 Mahogany Violet, 5-65 Red Mahogany, 5-7 Matte, 5-8 Brown, and more at levels 3-4
- Level 6 (20 shades): 6-0, 6-00, 6-01, 6-1, 6-2, 6-3, 6-34, 6-4, 6-46, 6-52, 6-65, 6-66, 6-7, 6-8, plus more
- Level 7-10 (following same tone families)
- High Lift (2): HL-00, HL-12
- Boosters (4): -11 Ash, -22 Violet, -33 Gold, -66 Red

**Gloss Toner — 36 missing shades** (we have 20 + 0-0 Clear = 21 already). Missing from our file based on retailer data: 1-1 Ash, 3-0 Natural, 4-0 Natural, 5-1 Ash, 6-1 Ash, 7-0, 7-01, 8-0 Natural, 8-1 Ash, 8-4 Copper, 9-0 Natural, 9-01, 9-3 Gold, 10-01, plus boosters (-44 Copper, -66 Red) and many more level variants.

**Missing product lines:**
- Cream Lightener with Bonding Complex (450g, 900g) — different from Epilogue Lightener
- Epilogue Permanent Color Book (swatch book)
- Applicator Bottle
- All-Purpose Apron
- Color Cape
- Shampoo and Conditioner products

## Changes

### 1. `src/data/professional-supply-library.ts`
- Remove the single collapsed `Epilogue Permanent Color` entry
- Add all 84 individual Epilogue shades as separate entries (e.g., `Epilogue 1-0 Natural`, `Epilogue 3-0 Natural`, etc.)
- Add ~36 missing Gloss Toner shades to reach the full 56
- Add Epilogue Boosters (4 shades) as separate entries
- Add Cream Lightener with Bonding Complex
- Add accessories: Applicator Bottle, All-Purpose Apron, Color Cape, Epilogue Color Book
- This brings the total from 56 to approximately 178 entries

### 2. Database sync
- After updating the static file, the existing DB seeding mechanism (`useSeedSupplyLibrary`) handles inserting from the static data
- For already-seeded DBs, insert the new products directly via DB insert to avoid duplicating existing rows — insert only products where `brand = 'Danger Jones'` AND `name` does not already exist

### Files Modified
- `src/data/professional-supply-library.ts` — expand Danger Jones section (~300 new lines)

### Technical Notes
- Each shade follows the naming convention: `Epilogue [level]-[tone] [Tone Name]` (e.g., `Epilogue 6-2 Violet`)
- Gloss Toner naming: `Gloss Toner [level]-[tone] [Tone Name]`
- Categories: Epilogue shades → `color`, Gloss Toners → `toner`, Boosters → `color`, accessories → `treatment` (or a new `accessory` category)
- The `category` enum in the static file may need an `accessory` addition for non-chemical products

