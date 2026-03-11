

## Enhance Retail Breakdown: Category Drilldowns + Fix Total

### Problems
1. **Total mismatch**: The Retail card headline shows `rawProdRevenue` (from POS daily summary), while the breakdown rows come from `useRetailBreakdown` (transaction items). These sources can diverge. Fix: use `retailBreakdown.totalRetailRevenue` as the headline when available.
2. **No category drilldowns**: Sub-category rows (Products, Merch, Gift Cards, Extensions) are static text — clicking them should open a filtered drilldown.
3. **Gift Cards**: Already in the code/data model, just needs drilldown support like the others.

### Changes

**`src/components/dashboard/AggregateSalesCard.tsx`**
- Replace `rawProdRevenue` with `retailBreakdown?.totalRetailRevenue ?? rawProdRevenue` as the displayed Retail total and for percentage calculation
- Add a `retailCategoryDrilldown` state (`'Products' | 'Merch' | 'Gift Cards' | 'Extensions' | null`)
- Make each sub-category row clickable — on click, set `retailCategoryDrilldown` to that label
- Render a new `RetailCategoryDrilldown` dialog (or reuse `ServiceProductDrilldown` with a category filter) when `retailCategoryDrilldown` is set

**`src/components/dashboard/RetailCategoryDrilldown.tsx`** (new)
- A dialog showing product items filtered to the selected retail category
- Reuses the same `phorest_transaction_items` query but filters items through `isExtensionProduct`, `isMerchProduct`, `isGiftCardProduct` to show only matching items
- Groups by item name, shows quantity and revenue per item, sorted by revenue descending
- Header shows category icon + name, footer shows category total

**`src/hooks/useRetailCategoryItems.ts`** (new)
- Fetches transaction items for the date range + location, filters by the category's pattern matcher
- Returns `{ itemName, quantity, revenue }[]` sorted by revenue
- Uses the same `fetchAllBatched` pattern from `useRetailBreakdown`

### UI Behavior
- Clicking the main Retail card area still opens the full Products drilldown (by stylist)
- Clicking a specific sub-category row (Products/Merch/Gift Cards/Extensions) opens the category-specific drilldown showing individual items
- The Retail headline number matches the sum of all sub-category rows

### Files
1. `src/components/dashboard/AggregateSalesCard.tsx` — fix total, add category drilldown state + click handlers
2. `src/hooks/useRetailCategoryItems.ts` — new hook for fetching items by category
3. `src/components/dashboard/RetailCategoryDrilldown.tsx` — new dialog component for category item list

