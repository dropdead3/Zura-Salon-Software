

# Filter Out Brand Lines Already in the Supply Library

## Problem
The "Build Full Color Catalog" dialog shows brands like "Goldwell Topchic" and "Schwarzkopf Igora Royal" even though they already exist in the library. This happens because:

- The supply library stores products under parent brand names: **"Goldwell"**, **"Schwarzkopf"**
- The `ALL_BRANDS` list uses product-line names: **"Goldwell Topchic"**, **"Schwarzkopf Igora Vibrance"**
- The filter does an exact lowercase match, so `"goldwell topchic" !== "goldwell"` — no match, brand shown

## Fix

**`src/components/platform/backroom/BulkCatalogImport.tsx`**, line 267-269:

Change the `availableBrands` filter from exact matching to prefix/substring matching. A brand line should be excluded if any existing library brand is a prefix of (or is contained within) its name:

```ts
const availableBrands = useMemo(() => {
  const existingArr = Array.from(existingSet);
  return ALL_BRANDS.filter(b => {
    const lower = b.brand.toLowerCase();
    // Exclude if exact match OR if an existing parent brand is a prefix
    // e.g. existing "goldwell" matches "goldwell topchic"
    return !existingArr.some(existing =>
      lower === existing || lower.startsWith(existing + ' ')
    );
  });
}, [existingSet]);
```

This way "Goldwell Topchic" is filtered out when "Goldwell" exists, but unrelated brands like "Gold Standard Whatever" won't be caught (requires the space delimiter).

Single-file, ~5 line change. No database or backend changes needed.

