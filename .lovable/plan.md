

## Add Retail Type Column to Categories Tab

### What's changing
Add a "Type" column to the Categories table that classifies each product into one of the 4 retail types (Products, Merch, Extensions, Gift Cards) using the existing pattern-matching functions from `serviceCategorization.ts`.

### Changes

**1. `src/hooks/useProductBrands.ts` — `useProductCategorySummaries`**
- Add `name` to the select query (`category, name, retail_price, quantity_on_hand`)
- For each product, determine its retail type using `isExtensionProduct`, `isGiftCardProduct`, `isMerchProduct`
- Extend `CategorySummary` to include a `typeCounts: Record<string, number>` showing how many products of each retail type are in that category (e.g., `{ Products: 2, Extensions: 1 }`)

**2. `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` — `CategoriesTab`**
- Add a "Type" column after "Category" in the table header
- Display the dominant retail type, or show a breakdown if mixed (e.g., badges like `Products (2) · Extensions (1)`)
- Use small muted badges/pills for each type to keep it clean

### Layout
```text
Category    | Type               | Products | Total Stock | Inventory Value |
Hair Care   | Products           | 3        | 20          | $587.00         | ✎
Styling     | Products           | 3        | 43          | $996.00         | ✎
Extensions  | Extensions (2)     | 2        | 5           | $1,200.00       | ✎
            | Products (1)       |          |             |                 |
```

