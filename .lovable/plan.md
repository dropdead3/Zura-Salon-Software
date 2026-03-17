

# Massive Hair Color Library Expansion

## Current State
- 26 brands, 2,516 active products in the database
- Existing brands are mostly professional (Schwarzkopf, Wella, Redken, etc.)
- Missing: many professional brands + all non-professional/semi-permanent brands

## The Problem with Pure Web Scraping
Scraping every brand website would be expensive (hundreds of Firecrawl credits), slow, and unreliable — many brand sites don't list individual shades in scrapable formats. The "no mistakes" requirement rules out a scrape-and-hope approach.

## Proposed Approach: AI-Generated Catalog + Web Verification

### Phase 1 — New Edge Function: `generate-color-catalog`
Build a new edge function that uses a powerful AI model (GPT-5 or Gemini 2.5 Pro) to generate comprehensive, shade-level product catalogs for a given brand. These models have extensive, accurate knowledge of hair color product lines from their training data.

**How it works per brand:**
1. AI generates a complete product list (every shade, developer, lightener, toner) with structured output
2. Optionally verify against the brand website via a single Firecrawl scrape of their product page
3. Return structured product data ready for DB insert

### Phase 2 — New Edge Function: `bulk-catalog-import`
A batch orchestrator that:
1. Accepts a list of brands to catalog
2. Calls `generate-color-catalog` for each brand sequentially (to respect rate limits)
3. Upserts results into `supply_library_products` (matching on brand + name to avoid duplicates)
4. Returns a summary of what was added/updated

### Phase 3 — UI: Bulk Import Trigger
Add a "Build Full Catalog" action in the Supply Library admin UI that:
1. Shows the list of target brands (pre-populated with ~50+ known brands)
2. Lets the admin review and kick off the import
3. Shows real-time progress as each brand completes

### Brands to Add (~30+ new brands)

**Professional brands not yet in library:**
Aveda, Davines, Farouk (CHI subsidiary lines), Guy Tang #mydentity extensions, Keratin Complex, Lanza, Moroccanoil Color, Revlon Professional (Revlonissimo), Alfaparf Milano, Oway, Kérastase (color lines), Truss, Scruples, Celeb Luxury, ISO, Difiaba, Colorme, Elumen (Goldwell sub-line)

**Non-professional / direct-to-consumer color brands:**
Arctic Fox, Manic Panic, Good Dye Young, Crazy Color, Lime Crime Unicorn Hair, oVertone, Punky Colour, Iroiro, Adore, Ion (Sally Beauty), Splat, Raw Demi-Glaze, Lunar Tides, Shrine, Hally Hair, Garnier Olia (salon-adjacent), dpHUE

### Database Changes
- No schema changes needed — existing `supply_library_products` table handles everything
- New products inserted with `category`, `product_line`, `brand`, `name`, `size_options`
- Non-professional brands get a metadata distinction (can add a `is_professional` boolean column)

### Migration: Add `is_professional` Column
```sql
ALTER TABLE supply_library_products
  ADD COLUMN IF NOT EXISTS is_professional BOOLEAN NOT NULL DEFAULT true;
```
This lets the UI filter/group professional vs non-professional brands.

### Accuracy Safeguards
- Use the strongest available model (GPT-5 or Gemini 2.5 Pro) for generation
- Structured output with strict schema enforcement
- Each brand processed individually with brand-specific prompts
- Deduplication against existing DB entries before insert
- Admin review step before committing each brand's products

### Estimated Result
Current: 26 brands, ~2,500 products
Target: 55+ brands, ~8,000–12,000 products

