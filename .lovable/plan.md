

## Add Product Line-Item Drilldown per Stylist

**Goal**: When viewing "Products by Stylist," clicking a stylist row expands to show the individual products they sold (name + amount).

### 1. Update the hook to return per-staff product line items

**File**: `src/hooks/useServiceProductDrilldown.ts`

- Add a new field to `StaffServiceProduct`: `productItems: Array<{ itemName: string; amount: number }>`.
- While aggregating `productItems` in the product loop, also push each `{ itemName: item.item_name, amount: (total_amount + tax_amount) }` into a per-staff array.
- Return these arrays so the UI can render them.

### 2. Add expandable product list to the drilldown UI

**File**: `src/components/dashboard/ServiceProductDrilldown.tsx`

- Track `expandedStaffId` state (single string or null).
- On staff row click (product mode only), toggle expanded state.
- When expanded, render a list of `staff.productItems` below the row summary showing each product name and its tax-inclusive amount.
- Add a subtle chevron indicator on product-mode rows to signal expandability.
- Service-mode rows remain non-expandable (no change).

### Technical details
- Product items are already fetched with `item_name` — no additional query needed.
- Tax-inclusive per-item: `(total_amount + tax_amount)`.
- Items sorted by amount descending within each staff expansion.
- Styling: indented list within the `bg-muted/30 rounded-xl` card, separated by thin borders, using `text-xs` for item names and `tabular-nums` for amounts.

