

## Enhance Inventory Management: Brand+Category Grouping, Supplier Memory, and Smart PO Creation

### Current Gaps

1. **StockTab** groups by brand only — no category sub-grouping within brands
2. **ReorderTab** shows a flat list — doesn't group by supplier/brand for PO creation
3. **No supplier info** is pulled into inventory rows — `product_suppliers` data exists but isn't surfaced
4. **BackroomBulkReorderDialog** creates individual POs per product instead of multi-line POs grouped by supplier
5. No way to assign/manage suppliers from within the inventory section

### Plan

#### 1. Enhance StockTab — Brand → Category two-level grouping

**File:** `inventory/StockTab.tsx`

- Change grouping logic: group by brand first, then by category within each brand
- Brand header row: collapsible, shows brand name + total product count + a "Supplier" chip if a supplier is saved for products in that brand
- Category sub-header within each brand section
- Add a "Set Supplier" button on the brand header that opens a supplier assignment dialog
- Pull `product_suppliers` data and merge into inventory rows (join on product_id)

#### 2. Create SupplierAssignDialog — assign supplier to brand products

**File:** `inventory/SupplierAssignDialog.tsx` (new)

- Dialog triggered from brand header row "Set Supplier" button
- Form fields: Supplier Name, Email, Phone, Website, Account Number, Lead Time, MOQ
- Pre-fills if any product in that brand already has a supplier saved
- On save: upserts `product_suppliers` for ALL products in the selected brand (batch operation)
- Uses existing `useUpsertSupplier` hook (extended for batch)

#### 3. Enhance ReorderTab — Supplier-grouped reorder with smart PO creation

**File:** `inventory/ReorderTab.tsx`

- Fetch `product_suppliers` alongside inventory data
- Group reorder queue by supplier (brand → supplier mapping)
- Each supplier group shows: supplier name, email, product count, total estimated cost
- "Create PO" button per supplier group → creates a single multi-line PO using `useCreateMultiLinePO`
- "Create All POs" bulk action → creates one PO per supplier with all their products as lines
- "Email PO" action on draft POs → uses existing `send-reorder-email` edge function
- Products without a supplier assigned show in an "Unassigned" group with a prompt to set supplier

#### 4. Enhance OrdersTab — Show line items and supplier context

**File:** `inventory/OrdersTab.tsx`

- Fetch `purchase_order_lines` for expanded POs using `usePurchaseOrderLines`
- Show line items table in expanded view: Product Name, Qty Ordered, Qty Received, Unit Cost, Line Total
- Add "Email PO" button for draft/sent POs that calls `send-reorder-email`

#### 5. Add batch supplier upsert hook

**File:** `src/hooks/useProductSuppliers.ts`

- Add `useBatchUpsertSupplier` mutation: accepts an array of product_ids + shared supplier info
- Upserts a `product_suppliers` row for each product_id in one batch

#### 6. Enrich BackroomInventoryRow with supplier data

**File:** `src/hooks/backroom/useBackroomInventoryTable.ts`

- After fetching products, also fetch `product_suppliers` for the org
- Merge supplier_name and supplier_email into each `BackroomInventoryRow`
- Add `supplier_name` and `supplier_email` to the `BackroomInventoryRow` interface

### Files

| File | Action |
|------|--------|
| `src/hooks/backroom/useBackroomInventoryTable.ts` | **Edit** — Add supplier fields to row interface, join supplier data |
| `src/hooks/useProductSuppliers.ts` | **Edit** — Add `useBatchUpsertSupplier` for brand-level assignment |
| `src/components/dashboard/backroom-settings/inventory/StockTab.tsx` | **Edit** — Brand→Category grouping, supplier chip, "Set Supplier" button |
| `src/components/dashboard/backroom-settings/inventory/SupplierAssignDialog.tsx` | **Create** — Supplier assignment dialog for brand products |
| `src/components/dashboard/backroom-settings/inventory/ReorderTab.tsx` | **Edit** — Group by supplier, multi-line PO creation, email PO |
| `src/components/dashboard/backroom-settings/inventory/OrdersTab.tsx` | **Edit** — Line items in expanded view, email PO action |

