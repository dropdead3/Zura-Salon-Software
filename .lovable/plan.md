

## Enhance Products Tab: Add Type, Brand & Location Filters + Polish

### Current Gaps
1. **Products tab** only filters by Category — no Brand, Location, or Type (Extension/Merch/Gift Card/Product) filters
2. No "Type" column in the Products table — the Categories tab shows Type badges but the main Products list doesn't
3. `useProducts` hook doesn't support `brand` filtering
4. No product count / summary stats shown above the table
5. Brand and Category filters in the form dialog are free-text inputs instead of selects from existing values

### Changes

**`src/hooks/useProducts.ts`** — Extend `ProductFilters` and query
- Add `brand?: string` to `ProductFilters`
- Add `.eq('brand', filters.brand)` when set and not `'all'`
- Add a new `useProductBrandsList()` hook that returns distinct brand names (similar to `useProductCategories`)

**`src/components/dashboard/settings/RetailProductsSettingsContent.tsx`** — `ProductsTab`

1. **Add filter state**: `brandFilter`, `locationFilter`, `typeFilter` (Products/Merch/Extensions/Gift Cards)
2. **Add filter controls** in the toolbar row:
   - Brand select (from `useProductBrandsList`)
   - Location select (from `useActiveLocations`, only if >1 location)
   - Type select (Products / Merch / Extensions / Gift Cards)
3. **Add "Type" column** to the table between Category and SKU — show a small Badge using the existing `isExtensionProduct`/`isMerchProduct`/`isGiftCardProduct` classification
4. **Type filtering**: Done client-side using the categorization utils (since type isn't a DB column)
5. **Product count badge**: Show `"X products"` summary next to the filters
6. **Form dialog**: Replace free-text Brand/Category inputs with `Select` dropdowns populated from existing values, with an "Other..." option that reveals a text input for new values

**Filter toolbar layout** (wrapping flex):
```text
[Search_______________] [Category ▾] [Brand ▾] [Type ▾] [Location ▾] [Low Stock ○] [+ Add Product]
```

### Summary
Two files changed. Adds 4 new filter dimensions, a Type column, and smarter form inputs. No new dependencies.

