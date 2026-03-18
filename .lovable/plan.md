

# Supplier Settings Section

Add a new "Suppliers" section to the Backroom sidebar that serves as the central place to manage suppliers, their contact info, which products they supply, and which products still need a supplier assigned.

## Layout

```text
┌─────────────────────────────────────────────────────┐
│  SUPPLIERS                                          │
│  Manage your suppliers and product assignments      │
├──────────────────────┬──────────────────────────────┤
│  SUPPLIER LIST       │  SUPPLIER DETAIL / EDITOR    │
│                      │                              │
│  [+ Add Supplier]    │  Name, Email, Phone, Website │
│                      │  Account #, Lead Time, MOQ   │
│  ● Goldwell (12)     │  ─────────────────────────── │
│  ● Wella (8)         │  LINKED PRODUCTS (12)        │
│  ● Joico (3)         │  Product A  ✕                │
│                      │  Product B  ✕                │
│                      │  [+ Link Products]           │
└──────────────────────┴──────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  ⚠ UNLINKED PRODUCTS (7 products without supplier) │
│  ┌──────────────────┬──────────┬─────────────────┐  │
│  │ Product Name     │ Brand    │ [Assign ▾]      │  │
│  │ L'Oréal Majirel  │ L'Oréal  │ [Assign ▾]      │  │
│  └──────────────────┴──────────┴─────────────────┘  │
│  Or: [Assign all L'Oréal products to...]            │
└─────────────────────────────────────────────────────┘
```

## What We'll Build

### 1. Sidebar Entry
Add "Suppliers" to the `sections` array in `BackroomSettings.tsx` between "Inventory" and "Permissions", using the `Truck` icon.

### 2. Supplier List + Detail Panel (`SupplierSettingsSection.tsx`)
- **Left panel**: List of unique suppliers from `product_suppliers`, grouped with product count badges. "Add Supplier" button at top.
- **Right panel**: Editable form for selected supplier (name, email, phone, website, account #, lead time, MOQ). Uses `useProductSuppliers` and `useUpsertSupplier`.
- **Linked Products sub-list**: Shows products assigned to this supplier with remove buttons. "Link Products" button opens a multi-select dialog of unlinked products.

### 3. Unlinked Products Banner
- Below the main panel, a card shows products that have no `product_suppliers` row.
- Each row has a dropdown to quickly assign to an existing supplier or create a new one.
- Brand-level batch assign button reuses existing `SupplierAssignDialog` logic.

### 4. Data Hook (`useSupplierSettings.ts`)
- Aggregates `product_suppliers` into a supplier-centric view: groups rows by `supplier_name`, deduplicates contact info, lists linked product IDs.
- Computes unlinked products by diffing tracked products against those with supplier rows.
- Provides `linkProducts(supplierName, productIds[])` and `unlinkProduct(supplierId)` mutations.

## Files

| File | Action |
|------|--------|
| `src/hooks/backroom/useSupplierSettings.ts` | **Create** — supplier-centric aggregation + link/unlink mutations |
| `src/components/dashboard/backroom-settings/SupplierSettingsSection.tsx` | **Create** — full supplier management UI |
| `src/pages/dashboard/admin/BackroomSettings.tsx` | **Edit** — add "Suppliers" to sidebar sections and render component |

## Technical Notes
- Built entirely on the existing `product_suppliers` table — no migrations needed.
- The `vendors` / `vendor_products` tables exist but aren't used by the backroom; this stays on `product_suppliers` for consistency.
- Supplier identity is keyed by `supplier_name` (matching existing `SupplierAssignDialog` behavior). Editing a supplier's contact info batch-updates all `product_suppliers` rows sharing that name.

