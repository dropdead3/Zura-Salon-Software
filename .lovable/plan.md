

# "3 Need Action" Is Wrong — Should Count All Out-of-Stock Products

## Root Cause

The "need action" count only includes products where `recommended_order_qty > 0`. That value is calculated in `computeReorderFields` (line 124-125 of `useBackroomInventoryTable.ts`):

```text
orderQty = target != null && (needsReorder || qty <= 0) ? Math.max(0, target - qty) : 0
recommendedOrderQty = target != null ? Math.max(0, target - qty - openPoQty) : 0
```

Both require `target != null`, which means `parLevel` or `reorderLevel` must be set. Only 3 of your 191 products have par/reorder levels configured, so the other 188 out-of-stock products show `recommended_order_qty = 0` and are excluded from the count.

## Proposed Fix

### 1. `StockTab.tsx` — Fix the "need action" KPI count
Change the filter from `recommended_order_qty > 0` to also include out-of-stock products regardless of whether they have a suggested quantity:

```
needsReorder = inventory.filter(r => 
  r.recommended_order_qty > 0 || r.stock_state === 'out_of_stock' || r.stock_state === 'low_stock'
).length
```

This way "need action" reflects all products that genuinely need attention — whether or not they have reorder levels configured.

### 2. `computeReorderFields` — Default to ordering 1 unit for out-of-stock items with no target
When `qty <= 0` and no par/reorder level is set, default `recommendedOrderQty` to 1 so they appear actionable:

```
// If out of stock with no target, suggest at least 1
const recommendedOrderQty = target != null 
  ? Math.max(0, target - qty - openPoQty) 
  : (qty <= 0 ? 1 : 0);
```

| File | Change |
|------|--------|
| `useBackroomInventoryTable.ts` (line 125) | Default `recommendedOrderQty` to 1 for out-of-stock items with no target |
| `StockTab.tsx` (line 185) | Include `out_of_stock` and `low_stock` in the "need action" count |

