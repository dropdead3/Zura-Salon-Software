

# Expand CHI, Clairol, Rusk + Joico Vero K-PAK + Add catalog_coverage Metadata

## Current State

| Brand | Current | Target | Key Gaps |
|-------|---------|--------|----------|
| **CHI** | 39 | ~90 | Ionic Color missing: RV, C, W, B tones at levels 3-4, 8-10; Ionic Shine missing most tones; no CHI Infra Treatment line |
| **Clairol** | 39 | ~80 | Liquicolor missing: W (Warm), R (Red), RN (Red Natural), RV (Red Violet), G (Gold) at many levels; Premium Creme missing A/G/W/R tones |
| **Rusk** | 33 | ~70 | Deepshine Permanent missing: .1/.3/.4/.5/.6 tones at most levels; Demi missing matching tones; Pure Pigments has only 5 of ~8 shades |
| **Joico Vero K-PAK** | 48 (already expanded) | ~60 | Missing: V (Violet) series at 5V/6V/7V, RV at levels 7-8, NN (Natural Natural) at 5-8, C (Copper) at 6-8, WB (Warm Beige) at 7-9 |

## Changes

### 1. `src/data/professional-supply-library.ts` — Brand Expansions (~350 new lines)

**CHI** (39 → ~90):
- Ionic Color Permanent: Add missing tones per level — RV (Red Violet), B (Brown), CM (Chocolate Mocha), CG (Champagne Gold) at levels 3-4, 8-10. Add 50-series High Lifts (50-3G, 50-5W, 50-4N)
- Ionic Shine Demi: Expand from 7 shades to ~25 — add A, G, C, W, RV tones at levels 5-9
- Add CHI Infra Treatment, Silk Infusion, Keratin Mist as treatment products

**Clairol** (39 → ~80):
- Liquicolor Permanent: Add missing tone families — W/Warm (5W-9W), RN/Red Natural (5RN-8RN), RV/Red Violet (4RV-7RV), additional G/Gold at levels 3/5/9. Add HL High Lifts (HLN, HLG, HLV)
- Premium Creme Demi: Add A (Ash), G (Gold), W (Warm), RN tones at levels 5-9
- Add Beautiful Collection semi-permanent line (8-10 key shades)

**Rusk** (33 → ~70):
- Deepshine Permanent: Add .1 (Ash), .3 (Gold), .4 (Copper), .5 (Mahogany), .6 (Red) tones at levels 4-9. Add .44 (Intense Copper), .66 (Intense Red) at levels 5-7
- Deepshine Demi: Add matching .1/.3/.4 tones at levels 5-8
- Pure Pigments: Add Blue, Brown, Clear (bringing from 5 to 8)
- Add Deepshine Boost boosters

**Joico Vero K-PAK** (48 → ~60):
- Add missing tones: 3A Ash, 4A Ash, 4B Beige, 5V Violet, 6V Violet, 7V Violet, 7RC Red Copper, 7RR Red, 9B Beige, 10B Beige
- Add NN (Natural Natural): 5NN, 6NN, 7NN, 8NN

### 2. `src/data/professional-supply-library.ts` — Add `catalog_coverage` Metadata

Add a new exported constant `BRAND_CATALOG_COVERAGE` that maps brand names to their coverage status:

```typescript
export type CatalogCoverage = 'complete' | 'partial';

export const BRAND_CATALOG_COVERAGE: Record<string, CatalogCoverage> = {
  'Schwarzkopf': 'complete',
  'Wella': 'complete',
  'Redken': 'complete',
  'L\'Oréal Professionnel': 'complete',
  'Matrix': 'complete',
  'Goldwell': 'complete',
  'Danger Jones': 'complete',
  'Pravana': 'complete',
  'Joico': 'complete',     // after this expansion
  'Paul Mitchell': 'complete',
  'Kenra': 'complete',
  'Pulp Riot': 'complete',
  'TIGI': 'complete',
  'CHI': 'complete',       // after this expansion
  'Clairol Professional': 'complete', // after this expansion
  'Rusk': 'complete',      // after this expansion
  // Remaining partial brands:
  'Framesi': 'partial',
  'Lakme': 'partial',
  'Keune': 'partial',
  'Elgon': 'partial',
  '#mydentity': 'partial',
  'Oligo': 'partial',
};
```

Also export a helper: `getBrandCoverage(brand: string): CatalogCoverage`

### 3. Database Sync

Batch-insert new products into `supply_library_products` using `WHERE NOT EXISTS` for each brand — same pattern as previous expansions.

### Files Modified
- `src/data/professional-supply-library.ts` — ~350 new product lines + coverage metadata (~30 lines)

