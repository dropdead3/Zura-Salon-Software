

## Inline Editable Stock/Min/Max + PDF Export for Stock Tab

### Changes

#### 1. Inline Editable Cells in StockTab

**File: `inventory/StockTab.tsx`** — Replace static Stock, Min, Max cells with click-to-edit inputs:

- Create an `InlineEditCell` sub-component: displays value as text, on click switches to a number input, on blur/Enter saves
- **Stock edits**: Use `useLogStockMovement` to post an `adjustment` ledger entry (quantity_change = newValue - oldValue, quantity_after = newValue). This triggers the existing DB trigger that updates `inventory_projections` and `products.quantity_on_hand`.
- **Min/Max edits**: 
  - If location-scoped: upsert `location_product_settings` via `useUpsertLocationProductSetting`
  - If org-wide: update `products` table directly (reorder_level / par_level columns)
- Invalidate `backroom-inventory-table` query on success
- Visual: subtle dashed underline on editable cells, input appears with auto-focus + select-all

#### 2. PDF Export Button

**File: `inventory/StockTab.tsx`** — Add a "Download PDF" button in the filter bar:

- Uses existing `jsPDF` + `jspdf-autotable` + `reportPdfLayout` pattern (same as other reports)
- Branded header via `addReportHeader` with org name/logo
- Table: Product, Brand, Category, Stock, Min, Max, Status, Cost
- Footer via `addReportFooter`
- Filename: `inventory-stock-{date}.pdf`

#### 3. Inline Edit Hook

**File: `src/hooks/backroom/useInlineStockEdit.ts`** (new) — Encapsulates the three mutation types:
- `adjustStock(productId, currentQty, newQty, orgId, locationId?)` → posts ledger entry
- `updateMinMax(productId, field, value, orgId, locationId?)` → upserts setting or product

### Files

| File | Action |
|------|--------|
| `src/hooks/backroom/useInlineStockEdit.ts` | **Create** — Mutations for stock adjustment and min/max updates |
| `src/components/dashboard/backroom-settings/inventory/StockTab.tsx` | **Edit** — Add InlineEditCell, PDF export button, wire mutations |

