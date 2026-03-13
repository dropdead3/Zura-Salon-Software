

# Full Shade Expansion — All Brands in Professional Supply Library

## Scope
Expand every product line in `src/data/professional-supply-library.ts` from generic entries (e.g., "Igora Royal Permanent Color") into individual shade entries (e.g., "Igora Royal 1-0 Black Natural", "Igora Royal 4-0 Medium Brown Natural", etc.). This applies to all color lines, toner lines, vivids/semi-permanents, and developers across all ~25 brands.

**Danger Jones** is already expanded — will be verified for completeness but no major changes expected.

## Estimated scale
- ~3,000–5,000 individual entries across all brands
- File will grow from ~290 lines to ~4,000–6,000 lines
- Single file change: `src/data/professional-supply-library.ts`

## Approach per brand

For each brand, expand these product types into individual shades:
1. **Permanent color** — every shade number (e.g., 6-0, 7-1, 9-43)
2. **Demi-permanent** — every shade
3. **Toners/glosses** — every shade
4. **Semi-permanent/vivids** — every named color
5. **Lighteners** — keep as single entries (no shade variants)
6. **Developers** — expand to individual volume variants (10, 20, 30, 40 Vol) with size options
7. **Bond builders/treatments** — keep as single entries (no shade variants)

## Brands to expand (26 total)
Schwarzkopf, Wella, Redken, L'Oréal Professionnel, Matrix, Goldwell, Pravana, Joico, Paul Mitchell, Kenra, Pulp Riot, Oligo, #mydentity, TIGI, Framesi, Lakme, Keune, Rusk, CHI, Clairol Professional, Elgon, Uberliss, Olaplex, K18, Danger Jones (verify), Generic Developer

## Entry format (unchanged)
```ts
{ brand: 'Schwarzkopf', name: 'Igora Royal 6-0 Dark Blonde Natural', category: 'color', defaultDepletion: 'weighed', defaultUnit: 'g', sizeOptions: ['60ml'] },
```

## Technical notes
- No schema or interface changes needed — same `SupplyLibraryItem` type
- No changes to catalog UI components — they already handle large lists via alphabet filtering and search
- Lighteners, bond builders, and treatments stay as-is (no shade variants)
- Developers get volume-based variants where brand-specific developers exist

## Risk
- File size: Large but static data, no runtime performance concern (loaded once, filtered in memory)
- Accuracy: Shade lists sourced from brand websites and professional catalogs; some very new or discontinued shades may be missing

## Implementation
This will be done as a single large file rewrite of `src/data/professional-supply-library.ts`, preserving the existing structure and helper functions at the bottom.

