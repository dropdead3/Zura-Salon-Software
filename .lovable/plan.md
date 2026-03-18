

## Fix: Auto Create PO Not Working for Products Without Par Level

### Root Cause
The `recommended_order_qty` calculation requires `par_level` to be set. If only `reorder_level` (min stock) is configured, the formula `parLevel - qty - openPoQty` evaluates to `0` because `parLevel` is `null`. The dialog then skips all products where `recommended_order_qty <= 0` (line 59), resulting in "No products need reorder."

### Changes

#### 1. Fix reorder calculation fallback
**File:** `useBackroomInventoryTable.ts` — `computeReorderFields()`

When `par_level` is null but `reorder_level` is set, use `reorder_level` as a fallback target:
```ts
const target = parLevel ?? reorderLevel;
const recommendedOrderQty = target != null ? Math.max(0, target - qty - openPoQty) : 0;
```

This way, products with min=1 and qty=0 will get `recommendedOrderQty = 1`.

#### 2. Allow manual PO creation for selected items with zero recommended qty
**File:** `AutoCreatePODialog.tsx`

When the dialog receives manually selected products (user clicked "Create PO" with checkboxes), include items even if `recommended_order_qty` is 0 — default them to a quantity of 1 so they aren't silently dropped. Change line 59 from:
```ts
if (p.recommended_order_qty <= 0) continue;
```
to:
```ts
// Use recommended qty, but fall back to 1 for manually selected items
const orderQty = p.recommended_order_qty > 0 ? p.recommended_order_qty : 1;
```
And use `orderQty` instead of `p.recommended_order_qty` for grouping and PO line creation.

### Files

| File | Action |
|------|--------|
| `src/hooks/backroom/useBackroomInventoryTable.ts` | **Edit** — Fallback to `reorder_level` when `par_level` is null |
| `src/components/dashboard/backroom-settings/inventory/AutoCreatePODialog.tsx` | **Edit** — Don't skip manually selected items; default qty to 1 |

