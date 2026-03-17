

# Expand Kenra, Pulp Riot, and TIGI Catalogs

## Current State vs Target

| Brand | Current | Target | Gap |
|-------|---------|--------|-----|
| **Kenra** | 52 | ~110 | Missing: R/RV/BC/V tones at most levels in Permanent; missing Copper/Red/Violet/Brown tones in Demi; missing Studio Stylist Express |
| **Pulp Riot** | 80 | ~120 | Missing: Faction8 tones (2-series, Copper, Violet, Brown at levels 3-6); Liquid Demi missing levels 6-9 tones; missing semi-permanent colors (Lilac, Cleopatra, etc.) |
| **TIGI** | 44 | ~90 | Missing: Copyright Colour tones (Violet, Red, Mahogany, Copper at most levels); Gloss missing levels 5-8; missing Copyright Colour Creative intensifiers |

Also includes **Joico LumiShine** audit — currently 22 shades, full line has ~40+ (missing: BA Blue Ash series, V Violet series, WB Warm Beige at more levels, RB Red Brown).

## Changes

### `src/data/professional-supply-library.ts`

**Kenra** (52 → ~110):
- Permanent: Add missing tones per level — R (Red), RV (Red Violet), V (Violet), BC (Brown Copper), C (Copper), B (Brown) at levels 3-10. Add SB (Silver Blue) shades, MM (Metallic) series, HL High Lifts (HLA, HLN, HLG, HLBC)
- Demi: Add matching tones — A, G, BC, N, V, R at levels 5-10. Add SB/SM shades
- Add Kenra Color Creative (intensifiers): Red, Violet, Blue, Orange, Yellow, Clear

**Pulp Riot** (80 → ~120):
- Faction8: Add missing shades at levels 2-4 (Ash, Gold, Copper, Violet, Red tones), level 5 Brown/Copper, level 9-10 Violet/Gold variants. Add Booster shades (-11 Ash, -22 Violet, -33 Gold, -66 Red, -44 Copper)
- Liquid Demi: Add levels 6-7 Ash/Gold, level 8 Violet, level 9 Violet, and Boosters
- Semi-Permanent: Add Lilac, Cleopatra (Teal), Lemon Drop, Icy Toner, Tangerine, and any missing recent launches
- Add Pulp Riot Aftercare (PM Shampoo, PM Conditioner) as treatment

**TIGI** (44 → ~90):
- Copyright Colour Permanent: Add missing tones — /2 Violet, /3 Gold, /44 Copper Copper, /5 Mahogany, /6 Red, /35 Gold Mahogany, /46 Copper Red at levels 4-9. Add /00 Natural Natural at levels 5-8
- Copyright Colour Gloss: Add levels 5-8 in Natural, Ash, Gold, Violet tones. Add Ash Gold at more levels
- Add Copyright Colour Creative: Red, Blue, Violet, Yellow, Clear intensifiers
- Add Copyright Colour Mix Master: correctors and boosters

**Joico LumiShine** (22 → ~40):
- Add BA (Blue Ash) series: 5BA, 6BA, 7BA, 8BA, 9BA
- Add V (Violet) series: 5NV, 6NV, 7NV, 8NV
- Add RB (Red Brown): 4RB, 5RB, 6RB
- Add WB (Warm Beige) at more levels: 7NWB, 8NWB, 9NWB
- Add NG (Natural Gold): 5NG, 8NG, 9NG, 10NG

### Database Sync
After static file update, batch-insert new products into `supply_library_products` using `WHERE NOT EXISTS` to avoid duplicates for each brand, same pattern as Danger Jones and Pravana expansions.

### Files Modified
- `src/data/professional-supply-library.ts` — ~400 new product lines across 4 brands

