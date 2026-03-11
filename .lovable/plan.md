

## Separate Extension Product Sales from Retail

### Problem
Extension products (e.g. "20 inch SuperWeft Extensions" at $1,348) are categorized as retail/product items in POS data, inflating the "Products" metric and skewing retail analytics. The user wants a toggle on the Products sub-card to include/exclude extension products.

### Approach

The core challenge: `phorest_daily_sales_summary` pre-aggregates `product_revenue` with no item-level detail. To separate extensions, we need to query `phorest_transaction_items` for the extension amount and subtract it from the summary total.

**1. Create `useExtensionProductRevenue` hook** (`src/hooks/useExtensionProductRevenue.ts`)
- Query `phorest_transaction_items` where `item_type` is product/retail AND `item_name` matches extension patterns (reuse regex from `serviceCategorization.ts`: `extension|weft|tape.?in|hand.?tied|keratin bond|fusion|install|removal|move.?up`)
- Returns `{ extensionProductRevenue: number, isLoading }` for the given date range + location
- Uses batch fetching for >1000 rows

**2. Add toggle state to `AggregateSalesCard.tsx`**
- Add `excludeExtensions` boolean state (default `true` — extensions excluded from retail by default since the user says they skew numbers)
- A small toggle pill below the Products sub-card label: "Excl. Extensions" on / off
- When toggled on: `prodRevenue = actualProductRevenue - extensionProductRevenue`
- When toggled off: `prodRevenue = actualProductRevenue` (original behavior)
- Show the extension amount as a subtle note: e.g. "$1,348 extensions" when excluded

**3. Update `ServiceProductDrilldown` (Products by Stylist dialog)**
- Pass `excludeExtensions` state through
- When active, filter out extension product items from the drilldown list using the same pattern matcher
- Recalculate totals and percentages accordingly

**4. Add extension pattern utility** to `serviceCategorization.ts`
- Export `isExtensionProduct(itemName: string): boolean` function using the existing Extensions regex pattern
- Reusable across hooks and components

### Files changed
- `src/utils/serviceCategorization.ts` — add `isExtensionProduct()` export
- `src/hooks/useExtensionProductRevenue.ts` — new hook
- `src/components/dashboard/AggregateSalesCard.tsx` — toggle state + adjusted product revenue display
- `src/components/dashboard/ServiceProductDrilldown.tsx` — filter extension items when toggle active
- `src/hooks/useServiceProductDrilldown.ts` — add extension revenue subtotal to return data

