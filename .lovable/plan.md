

# Show "Add to PO" for All Out-of-Stock Items

## Problem
The "Add to PO" button only appears when `recommended_order_qty > 0`, which requires reorder point / par level to be configured. Items that are out of stock but have no levels set get a recommended qty of 0, so the button is hidden — even though they clearly need ordering.

## Solution
Show the "Add to PO" button for any item that is **out of stock** (`stock_state === 'out_of_stock'`), regardless of whether a recommended order qty exists. When no recommended qty is available, default the suggested order qty to **1** (user can override via inline edit).

## Changes

### 1. CommandCenterRow.tsx
- Change the visibility condition from `needsReorder || isOverridden` to `needsReorder || isOverridden || row.stock_state === 'out_of_stock'`
- Update `displayOrderQty` to fall back to `1` when both override and recommended qty are absent but item is out of stock
- Apply the same condition change to the Suggested column cell so it shows the editable qty input for out-of-stock items

### 2. StockTab.tsx
- Update filtering/staging logic that checks `recommended_order_qty > 0` to also include out-of-stock items:
  - `stageSupplierToPo` filter
  - "Add Selected to PO" bulk action filter
  - `selectedReorderProducts` filter
  - `reorderCount` in supplier group headers

| File | Change |
|------|--------|
| `CommandCenterRow.tsx` | Expand visibility condition for Add to PO button + suggested qty cell |
| `StockTab.tsx` | Update reorder-eligible filters to include out-of-stock items |

