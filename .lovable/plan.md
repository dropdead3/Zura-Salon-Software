

## Enhance Stock Tab: Cleaner UI, Smart Reorder, Auto PO Creation

### Problems
1. Product names redundantly include container size (e.g., "Epilogue 1-0 Natural — 57g") when Container is already a column
2. No recommended reorder quantity logic — Order Qty is a simple `par_level - qty` with no intelligence
3. No way to reorder directly from the Stock tab
4. No bulk "Auto Create POs" action

### Changes

#### 1. Strip container size from product names
**File:** `StockTab.tsx` (CategoryGroup, line ~517)

Add a helper to strip trailing size suffixes (`— 57g`, `— 113g`, etc.) from display names:
```tsx
function stripSizeSuffix(name: string): string {
  return name.replace(/\s*[—–-]\s*\d+(\.\d+)?\s*(g|oz|ml|L)\s*$/i, '').trim();
}
```
Apply to `{stripSizeSuffix(row.name)}` in the product cell.

#### 2. Smarter recommended order quantity
**File:** `useBackroomInventoryTable.ts`

Currently: `orderQty = Math.max(0, parLevel - qty)` — this is naive.

Change to: If `reorder_level` is set and `qty <= reorder_level`, compute `orderQty = parLevel - qty`. If no par/reorder set, `orderQty = 0`. Also add a `recommended_order_qty` field that factors in open PO quantities (fetch from `purchase_order_lines` with non-closed PO status) so the recommendation doesn't double-order.

Add to the query:
- Fetch open PO lines for all products in one query
- `recommended_order_qty = max(0, (par_level ?? 0) - qty - openPoQty)`
- Add `open_po_qty` to `BackroomInventoryRow`

#### 3. Add per-row reorder button + selection checkboxes
**File:** `StockTab.tsx`

- Add a checkbox column (leftmost) for multi-select
- Replace the single History icon column with a two-button group: History + ShoppingCart (reorder)
- Per-row reorder button opens a quick confirmation or directly creates a draft PO for that product
- Only show reorder button when `order_qty > 0`

#### 4. "Auto Create POs" bulk action
**File:** `StockTab.tsx`

Add a top-level action bar (next to PDF export) with:
- **"Auto Create POs"** button — groups all selected (or all needing reorder) products by supplier, creates one multi-line PO per supplier using `useCreateMultiLinePO`
- Shows a confirmation dialog before executing: lists supplier groups, line counts, and estimated costs
- Products without an assigned supplier get flagged (skipped or grouped under "Unassigned")
- After creation, shows toast with count of POs created and option to navigate to Orders tab

**New file:** `AutoCreatePODialog.tsx` — confirmation dialog showing:
- Table of supplier groups with product counts and est. cost
- Checkboxes to include/exclude suppliers
- "Create X Draft POs" button
- Warning for unassigned-supplier products

#### 5. Visual improvements
**File:** `StockTab.tsx`

- Category sub-headers: format with `formatCategoryLabel` (title case, no dashes) — already done for filter dropdown, now apply to table sub-headers too
- Tighter row spacing for density
- Order Qty column: show with warning color when > 0, muted dash when 0
- Add subtle row hover highlight for rows needing reorder

### Files

| File | Action |
|------|--------|
| `src/hooks/backroom/useBackroomInventoryTable.ts` | **Edit** — Add `open_po_qty`, `recommended_order_qty`, fetch open PO lines |
| `src/components/dashboard/backroom-settings/inventory/StockTab.tsx` | **Edit** — Strip size suffix, add checkboxes, reorder button, Auto Create POs, format category headers |
| `src/components/dashboard/backroom-settings/inventory/AutoCreatePODialog.tsx` | **Create** — Confirmation dialog for bulk PO creation |

### Suggested Enhancements (included in this plan)
- **Open PO awareness**: The recommended qty deducts units already on open POs to prevent double-ordering
- **Supplier validation**: Auto Create POs skips products without assigned suppliers and shows a warning count
- **Draft-first safety**: All auto-created POs start as "draft" — no emails sent until manually reviewed in the Orders tab
- **Post-creation navigation**: Success toast includes a link/action to switch to the Orders tab to review drafts

