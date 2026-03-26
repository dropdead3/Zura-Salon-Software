

## Gap Analysis: Color Type Classification Implementation

### What's Working Well
- Database schema: `color_type` enum exists on both `supply_library_products` and `products`
- Supply Library UI: Color Type dropdown appears conditionally when `category === 'color'`
- Allowance Calculator: `requiresDeveloper()` uses data-first approach with keyword fallback
- Sync logic: `color_type` propagates from library → org products via backfill

### Gaps Found

**1. Category overlap: `semi-permanent` exists as both a category AND a color_type**

The `CATEGORIES` array includes `'semi-permanent'` as a standalone category (line 51 of SupplyLibraryTab). But the Color Type dropdown only shows when `category === 'color'`. This means:
- A product filed under category `semi-permanent` will never show the Color Type dropdown
- The `requiresDeveloper()` fallback keyword detection checks for "semi" in the combined name+category string — a product with `category: 'semi-permanent'` would correctly be excluded, but it would never have `color_type` set structurally

**Fix:** In `requiresDeveloper()`, also check if `product.category === 'semi-permanent'` as an explicit non-developer signal before keyword fallback. This is partially covered by the keyword check but should be explicit for clarity.

**2. Warning not cleared when the last permanent/demi product is removed from a bowl**

When a user removes the only permanent/demi color line from a bowl, the developer warning banner persists because `removeLineFromBowl` doesn't re-evaluate whether the warning should be cleared.

**Fix:** In `removeLineFromBowl`, after filtering lines, check if the bowl still contains any `requiresDeveloper` products. If not, remove the bowl index from `developerWarningBowls`.

**3. Warning uses stale bowl state after `addProductToBowl`**

At line 557, the code reads `bowls[bowlIdx]` to check for existing developers, but this reads the state *before* the `setBowls` call above it has taken effect (React state is async). The check should use the lines that were just constructed inside the `setBowls` updater, not the outer `bowls` reference.

**Fix:** Move the developer-check logic inside the `setBowls` updater function, or capture the updated lines in a ref to check after the state update.

**4. No color_type displayed in the Supply Library product table**

After setting the Color Type on a product, there's no visible indicator in the product table rows showing what type was assigned. Users can't verify classifications without opening each product's edit dialog.

**Fix:** Add a subtle badge or label in the product table row (e.g., a small "Perm" / "Demi" / "Semi" badge) for products with `color_type` set.

**5. Bulk Import doesn't set color_type**

The Bulk Catalog Import (Gemini/Firecrawl) likely doesn't extract or set `color_type` on imported products. New bulk-imported color products would have `null` color_type, relying entirely on keyword fallback.

**Fix:** This is acceptable short-term (keyword fallback handles it), but worth noting as a future enhancement — the AI import could attempt to classify color types during ingestion.

### Recommended Priority

| # | Gap | Severity | Effort |
|---|-----|----------|--------|
| 3 | Stale state in developer check | Bug — warning may not trigger | ~5 lines |
| 2 | Warning persists after removing color product | Bug — stale UI | ~8 lines |
| 1 | Semi-permanent category edge case | Low risk (keyword fallback works) | ~2 lines |
| 4 | No color_type visibility in table | UX gap | ~10 lines |
| 5 | Bulk import doesn't classify | Enhancement | Future scope |

### Scope
- All fixes in `AllowanceCalculatorDialog.tsx` (gaps 1–3)
- Table badge in `SupplyLibraryTab.tsx` (gap 4)
- No database changes needed

