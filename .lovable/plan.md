

# Add Brand Wizard — with Website Scraping for Product Discovery

Extends the approved wizard plan with a Firecrawl-powered "Scrape Brand Website" step that auto-discovers professional color and chemical products from the brand's site.

## Architecture

The wizard gains an optional scraping path between Steps 1 and 3:

```text
Step 1: Brand Details (name, description, website URL, category)
Step 2: Brand Logo (upload or skip)
Step 2.5: Website Scrape (NEW — optional, appears if website URL provided)
Step 3: Import Products (CSV upload OR use scraped results OR add manually)
Step 4: Review & Confirm
```

## Step 2.5 — Website Product Scrape

When the user enters a website URL in Step 1, the wizard offers a "Scan website for products" action before the CSV/manual step.

### Flow
1. **Map the site** — call existing `firecrawl-map` edge function to discover product/catalog URLs (filter for paths containing `products`, `color`, `shade`, `catalog`, `professional`)
2. **Scrape product pages** — call `firecrawl-scrape` with JSON extraction format on the top matched URLs, using a schema targeting product names, categories, shade numbers, and sizes
3. **AI extraction** — send the scraped markdown to the Lovable AI gateway (Gemini Flash) with a prompt: "Extract professional salon color and chemical products from this content. Return JSON array with fields: name, category (Color/Developer/Treatment/Styling/Care), product_line, size_options"
4. **Present results** — show discovered products in a review table with checkboxes, letting the user select which to import
5. **Cross-reference CSV** — if user also uploads a CSV, show a diff view: products found in both (matched), only in scrape (new), only in CSV (CSV-only)

### New Edge Function: `scrape-brand-products`

Single edge function that orchestrates the map → scrape → AI extract pipeline server-side to avoid multiple round trips:

- Input: `{ websiteUrl, brandName, maxPages?: number }`
- Uses `firecrawl-map` to find product URLs (limit 20)
- Scrapes top 5-10 product/catalog pages via Firecrawl
- Sends combined markdown to Lovable AI gateway for structured extraction
- Returns: `{ products: Array<{ name, category, product_line, sizes }>, pagesScraped, confidence }`

Requires `FIRECRAWL_API_KEY` (already available via the existing edge functions) and `LOVABLE_API_KEY` for AI extraction.

### Firecrawl Connector

The project already has `firecrawl-scrape` and `firecrawl-map` edge functions deployed but no Firecrawl connection is linked. The Firecrawl connector will need to be connected before this feature works. The wizard will gracefully degrade — if scraping fails or the connector isn't configured, it shows a message and the user proceeds with CSV or manual entry.

## Database Changes

Same as the approved plan:
- `supply_library_brands` table (name, description, website_url, logo_url, country_of_origin, default_category, is_active)
- `brand-logos` storage bucket
- `brand_id` FK on `supply_library_products` with backfill migration

## UI Components

### Files Created
- `src/components/platform/backroom/AddBrandWizard.tsx` — 4.5-step wizard dialog
- `src/components/platform/backroom/BrandWebsiteScraper.tsx` — Step 2.5 scraper UI (progress indicator, product review table, select/deselect)
- `src/hooks/platform/useSupplyLibraryBrands.ts` — brand CRUD hooks
- `src/hooks/platform/useBrandWebsiteScrape.ts` — mutation calling `scrape-brand-products` edge function
- `supabase/functions/scrape-brand-products/index.ts` — orchestrator edge function

### Files Modified
- `src/components/platform/backroom/SupplyLibraryTab.tsx` — "+Add Brand" button, wizard trigger, logo thumbnails on brand cards

## Scraper UX Details

- Progress steps shown during scrape: "Discovering pages..." → "Scanning products..." → "Extracting data..."
- Estimated time indicator (~15-30 seconds)
- Results table with columns: Product Name, Category (auto-tagged), Product Line, Sizes
- Bulk select/deselect with "Select All Color" / "Select All Developer" quick filters
- "Re-scan" button if results look incomplete
- Confidence indicator per product (high/medium/low based on AI extraction certainty)
- When CSV is also provided, a toggle switches between "Scraped Products", "CSV Products", and "Combined (diff view)"

## Enhancement Notes

- The scraper doubles as a **validation layer**: if a CSV is uploaded, scraped products cross-reference to flag CSV rows that don't match any known product on the brand's site (possible typos or discontinued items)
- Product lines are auto-extracted using the existing `extractProductLine()` utility from `supply-line-parser.ts`
- Scrape results are cached in component state so re-visiting Step 2.5 doesn't re-scrape

