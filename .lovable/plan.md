

# Enhancements: Dry-Run Review, Firecrawl Verification, and Consumer Swatch Auto-Suggestion

Three targeted improvements to the bulk catalog import pipeline.

---

## 1. Dry-Run "Review Before Commit" Mode

The `bulk-catalog-import` edge function already accepts a `dry_run` parameter and returns generated products without inserting them. The UI just needs to expose this.

**Changes — `BulkCatalogImport.tsx`:**
- Add a two-phase flow: clicking "Generate Catalog" first runs with `dry_run: true`
- Show a review screen listing each brand's generated products (count, categories, sample names) in expandable rows
- Add "Confirm & Import" button that re-runs the same brands with `dry_run: false`
- Add "Discard" to cancel without inserting

**Changes — `bulk-catalog-import/index.ts`:**
- When `dry_run: true`, include the full `products` array in each brand result (currently omitted) so the UI can display them for review

---

## 2. Firecrawl Verification Step

After AI generates a brand's catalog, optionally scrape the brand's product page to cross-check shade counts and names.

**Changes — `generate-color-catalog/index.ts`:**
- Accept an optional `verify_url` parameter
- If provided and `FIRECRAWL_API_KEY` is available, scrape that URL via Firecrawl
- Pass both the AI-generated list and the scraped markdown to a second AI call that flags mismatches (missing shades, invented products)
- Return a `verification` object: `{ verified: boolean, warnings: string[], confidence: 'high' | 'medium' | 'low' }`

**Changes — `BulkCatalogImport.tsx`:**
- Add a `BRAND_URLS` lookup mapping known brands to their product pages (e.g., `'Arctic Fox': 'https://arcticfoxhaircolor.com/collections/hair-color'`)
- Pass `verify_url` when available during catalog generation
- Show verification confidence and warnings in the review screen

---

## 3. Consumer Brand Swatch Auto-Suggestion

Consumer brands (Arctic Fox, Manic Panic, etc.) have well-known, specific hex colors per shade. The current `suggestSwatchColor` utility is tuned for professional level-based codes and lacks direct mappings for named consumer shades.

**Changes — `src/lib/swatchSuggest.ts`:**
- Add a `CONSUMER_SHADE_MAP` dictionary mapping exact shade names to hex colors for major consumer brands:
  - Arctic Fox: ~20 shades (Phantom Green → #0A6B4F, Wrath → #E10600, etc.)
  - Manic Panic: ~30 shades (Atomic Turquoise → #00B2AA, Vampire Red → #8B0000, etc.)
  - Good Dye Young, Lunar Tides, Crazy Color, Lime Crime, oVertone, Punky Colour: ~10-15 shades each
- In `suggestSwatchColor`, check `CONSUMER_SHADE_MAP` first (fuzzy match on shade name) before falling through to the existing professional-level logic

**Changes — `generate-color-catalog/index.ts`:**
- Add `swatch_hex` as an optional field in the AI tool schema for consumer brands
- Prompt the AI to include the known hex color for each shade when the brand is non-professional
- This gives swatch data at generation time, reducing the need for post-import manual assignment

**Changes — `bulk-catalog-import/index.ts`:**
- When upserting consumer brand products, include `swatch_color` from the AI-generated `swatch_hex` field if present

---

## Summary of Files

| File | Change |
|------|--------|
| `src/components/platform/backroom/BulkCatalogImport.tsx` | Two-phase dry-run review UI, verification display, brand URL map |
| `supabase/functions/bulk-catalog-import/index.ts` | Return full products in dry-run, pass swatch_color on insert |
| `supabase/functions/generate-color-catalog/index.ts` | Firecrawl verification step, swatch_hex for consumer brands |
| `src/lib/swatchSuggest.ts` | Add CONSUMER_SHADE_MAP with ~150 brand-specific hex mappings |

