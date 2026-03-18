

# Supplier Enhancements: Rename, Deep-Link Quick Actions, Spend Summary

## Current State

1. **Rename** — Already fully implemented. The `useRenameSupplier` hook batch-updates all `product_suppliers` rows, and the UI has an inline edit pencil + save/cancel flow. This is done.

2. **Quick Actions deep-linking** — Currently "Start Count" → `inventory:counts` and "Create PO" → `inventory:orders`. Neither links to the Suppliers section. The `onNavigate` handler in `BackroomSettings.tsx` already supports `section:tab` format.

3. **Spend summary** — The `SupplierStatsCard` shows PO count, last order, and total PO spend. It does NOT show the total wholesale cost of all products supplied (i.e., `SUM(cost_price * quantity_on_hand)` for linked products), which is the margin visibility ask.

## Changes

### 1. No Change Needed for Rename
Already implemented — `useRenameSupplier` hook + inline pencil UI in `SupplierSettingsSection.tsx`.

### 2. Deep-Link Quick Actions to Suppliers (`BackroomDashboardOverview.tsx`)
Add a "Manage Suppliers" quick action button that navigates to `suppliers`. This surfaces the supplier section from the overview. The existing "Create PO" already goes to the right tab for PO creation, so the new button specifically targets supplier management.

Also, in the **Reorder Risk** alert rows within the Control Tower, if an alert references a supplier, add an `onClick` that navigates to `suppliers` so users can jump straight to the supplier with reorder-ready products.

### 3. Supplier Spend Summary Card (`useSupplierSettings.ts` + `SupplierSettingsSection.tsx`)

**Hook**: Add `useSupplierSpendSummary(supplierName)` that queries `products` for linked product IDs, computing:
- Total inventory value: `SUM(cost_price * quantity_on_hand)` for all linked products
- Total retail value: `SUM(retail_price * quantity_on_hand)`
- Implied margin: `(retail - cost) / retail * 100`
- Product count with cost data vs missing cost data

**UI**: Replace the current compact `SupplierStatsCard` with an enhanced version that shows two rows:
- **Row 1** (existing): PO count, last order, total PO spend
- **Row 2** (new): Inventory value at cost, inventory value at retail, implied margin %, products missing cost data warning

## Files

| File | Change |
|------|--------|
| `useSupplierSettings.ts` | Add `useSupplierSpendSummary` hook |
| `SupplierSettingsSection.tsx` | Enhance `SupplierStatsCard` with spend/margin row |
| `BackroomDashboardOverview.tsx` | Add "Manage Suppliers" quick action button |

No database changes needed.

