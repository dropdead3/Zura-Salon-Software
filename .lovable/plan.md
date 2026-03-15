

# Vish-Inspired Product Manager for Zura Backroom

This plan adds two major capabilities to the Backroom Product Catalog: **inline pricing & markup** on every product row, and a **full inventory table view** with stock levels, status badges, min/max calculations, and ordering shortcuts.

---

## What changes

### 1. Database migration — Add `markup_pct` and `min_stock_level` columns

The `products` table already has `cost_price`, `retail_price`, `container_size`, `quantity_on_hand`, `par_level`, `reorder_level`, and `cost_per_gram`. We need one new column:

- **`markup_pct`** (`numeric`, default `null`) — Markup percentage applied on top of wholesale cost. Used to auto-derive the charge-per-gram for billable products.

The existing `par_level` will serve as `max_stock_level` and `reorder_level` as `min_stock_level` (already present).

### 2. Inline pricing controls on `ProductRow`

**File: `BackroomProductCatalogSection.tsx`** — Expand the `ProductRow` component and the `BackroomProduct` interface.

Add a new **Zone 3** (pricing) that appears below the controls zone when the product is tracked:

```text
Desktop:
┌──────────────────────────────────────────────────────────────────────┐
│  [Toggle] Product Name · Brand     [Depletion] │ Billable │ Overage │
│           Category · SKU                                            │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Cost/g $__  │  Container __g  │  Markup __%  │  Charge/g $0.12│  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

- **Cost per gram** — Inline editable input, saves `cost_per_gram`
- **Container size** — Inline editable, saves `container_size`
- **Markup %** — Inline editable, saves `markup_pct`
- **Charge per gram** — Read-only computed value: `cost_per_gram * (1 + markup_pct/100)`. Shown as a muted badge.
- Each input uses a compact `h-7 w-20` field that auto-saves on blur (debounced mutation), matching the existing update pattern.

Also add **bulk pricing**: a "Set Pricing" button in the category filter area. Opens a small dialog where the user enters cost/g + markup % and applies to all visible products in that category/brand.

### 3. Inventory table view toggle

Add a **view switcher** (two icons: "Card view" and "Table view") in the catalog header next to the "tracked" badge.

**Table view** renders a sortable data table with columns:

| Column | Source | Notes |
|--------|--------|-------|
| Product | `name`, `brand` | Sticky left column |
| Category | `category` | Badge |
| Container | `container_size` | Editable inline |
| Stock | `quantity_on_hand` from `inventory_projections` join | Click-to-edit for manual stock count |
| Min | `reorder_level` | Editable |
| Max | `par_level` | Editable |
| Order Qty | `max(0, par_level - quantity_on_hand)` | Computed, shown when stock < par |
| Status | Derived | Badge: "In Stock" (green), "Replenish" (amber), "Urgent Reorder" (red), "Out of Stock" (red), "Not Stocked" (gray) |
| Cost/g | `cost_per_gram` | Editable |

**Status logic** (matching Vish):
- `quantity_on_hand <= 0` → Out of Stock
- `quantity_on_hand < reorder_level` → Urgent Reorder
- `quantity_on_hand < par_level` → Replenish
- `quantity_on_hand >= par_level` → In Stock
- No usage data & no stock → Not Stocked

### 4. KPI summary cards above the table

Three hero cards at the top of the inventory table view:

- **Current Stock** — Count of products with `quantity_on_hand > 0`
- **Products to Reorder** — Count with Out of Stock + Urgent Reorder + Replenish status
- **Total Active Products** — Count of all tracked products

These double as quick-filter buttons (clicking "Products to Reorder" filters the table).

### 5. Manual stock count (click-to-edit)

In table view, the Stock column cell is a compact inline input. Click to edit, Enter/Blur to save. Saving posts a `stock_movement` via the existing `postStockAdjustment` from `inventory-ledger-service.ts` with movement type `manual_count` to maintain ledger integrity.

### 6. Bulk "Set Pricing" dialog

A simple dialog triggered from a "Set Pricing" button that appears in the brand/category header. Fields:
- Wholesale Cost (per gram)
- Markup %
- Container Size (optional)

Applies to all products in the currently filtered category or brand. Uses the existing batch update pattern.

---

## Files impacted

| File | Action |
|------|--------|
| `BackroomProductCatalogSection.tsx` | Major — add pricing zone, view toggle, table view, KPI cards, bulk pricing |
| `src/hooks/backroom/useBackroomInventoryTable.ts` | New — hook joining products + inventory_projections for table data |
| `src/components/dashboard/backroom-settings/BackroomBulkPricingDialog.tsx` | New — bulk set pricing dialog |
| Database migration | Add `markup_pct` column to `products` |

## Technical notes

- The `inventory_projections` table + ledger trigger already exist. Stock count edits will use the existing `postStockAdjustment` service.
- Inline edits use the existing `updateMutation` pattern with optimistic updates for snappy UX.
- Table sorting will be client-side (dataset is typically < 500 products per org).
- All new fields are on the existing `products` table — no new tables needed.

