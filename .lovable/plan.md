

# Dynamic Brand Completeness Badges

## Approach

Extend the existing `get_supply_library_brand_summaries` RPC to also return counts of products missing key data fields. Then use that data in the UI to determine completeness dynamically — showing a "Partial" badge only when needed, positioned at the top-right corner of each brand card.

## Completeness Criteria

A brand is "complete" when **all** its active products have:
- `wholesale_price` (pricing data)
- `swatch_color` (swatch assignment) — only for `color`/`toner` categories
- `category` (category coverage)

## Changes

### 1. Database Migration — Update RPC

Alter `get_supply_library_brand_summaries()` to return two additional columns:
- `missing_price` — count of products with NULL `wholesale_price`
- `missing_swatch` — count of color/toner products with NULL `swatch_color`

```sql
CREATE OR REPLACE FUNCTION public.get_supply_library_brand_summaries()
RETURNS TABLE(brand text, category text, cnt bigint, missing_price bigint, missing_swatch bigint)
...
  SELECT brand, category, count(*) as cnt,
    count(*) FILTER (WHERE wholesale_price IS NULL) as missing_price,
    count(*) FILTER (WHERE swatch_color IS NULL AND category IN ('color','toner')) as missing_swatch
  FROM supply_library_products WHERE is_active = true
  GROUP BY brand, category ORDER BY brand, category
```

### 2. Hook — `src/hooks/platform/useSupplyLibrary.ts`

Update `BrandSummaryRow` type to include `missing_price` and `missing_swatch`.

### 3. UI — `src/components/platform/backroom/SupplyLibraryTab.tsx`

- Extend `BrandCardData` with `isComplete: boolean` computed from aggregated missing counts
- Remove `getBrandCoverage` import (no longer needed)
- Remove the hardcoded Complete/Partial badge
- Add a "Partial" warning badge **only** when incomplete, positioned at the **top-right corner** of the card using `absolute` positioning
- No badge shown for complete brands (completeness is assumed)

### 4. Cleanup — `src/data/professional-supply-library.ts`

Remove `BRAND_CATALOG_COVERAGE` and `getBrandCoverage` exports (dead code after this change).

