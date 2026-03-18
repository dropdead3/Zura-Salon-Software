

# Supplier Settings — Gaps & Enhancements

After reviewing the current implementation against the broader backroom workflows (PO creation, reorder emails, batch reorder, margin erosion), here are the real gaps:

## Gaps Found

### 1. No Supplier Rename
Supplier identity is keyed by `supplier_name` string. If an admin misspells a name or the supplier rebrands, there's no way to rename — they'd have to delete and re-create all links. Need a `useRenameSupplier` mutation that batch-updates all `product_suppliers` rows matching the old name.

### 2. No Delete Supplier
No way to fully remove a supplier (delete all their `product_suppliers` rows). An admin adding a supplier by mistake has no recourse. Need a `useDeleteSupplier` mutation with a confirmation dialog.

### 3. Unused `searchFilter` State
Line 51 declares `searchFilter` state but it's never wired to the supplier list sidebar. Should filter the supplier list when there are many suppliers.

### 4. `reorder_method` and `reorder_notes` Not Exposed
The `product_suppliers` table has `reorder_method` and `reorder_notes` columns (used by the PO email workflow), but the Supplier Settings form doesn't surface them. Admins can't configure *how* to reorder (email, phone, portal) or add standing notes.

### 5. No Confirmation on Unlink
Clicking the X button on a linked product immediately deletes the row with no confirmation. One misclick removes the supplier assignment silently.

### 6. LinkProductsDialog Only Shows Unlinked Products
The dialog filters to `useUnlinkedProducts()` — products already linked to *other* suppliers don't appear. This means you can't reassign a product from Supplier A to Supplier B through this UI. Should show all products with a badge indicating their current supplier.

### 7. No Supplier Stats / Activity Summary
The detail panel shows contact info and linked products but nothing about PO history, spend, or delivery performance — data that already exists in `purchase_orders` and `receiving_records`. Even a simple "X POs created, last order on Y" would add operational value.

## Proposed Changes

### Hook: `useSupplierSettings.ts`
- Add `useRenameSupplier` — batch-update `supplier_name` across all rows for the org
- Add `useDeleteSupplier` — delete all `product_suppliers` rows for a given name + org
- Add `useSupplierStats` — query `purchase_orders` for PO count, last order date, total spend per supplier name

### UI: `SupplierSettingsSection.tsx`
- **Supplier list search**: Wire the existing `searchFilter` state to filter the sidebar list
- **Rename**: Add an inline edit icon next to the supplier name header that opens a rename input
- **Delete**: Add a "Delete Supplier" button (destructive, with confirmation dialog) at the bottom of the detail panel
- **Reorder method fields**: Add `reorder_method` (select: Email / Phone / Portal / Other) and `reorder_notes` (textarea) to the contact form
- **Unlink confirmation**: Wrap the X button in an `AlertDialog` confirmation
- **Reassign support in LinkProductsDialog**: Show *all* products (not just unlinked), with current supplier badge; reassigning updates the existing row
- **Supplier stats card**: Below the contact form, show a compact card with PO count, last order date, and total units ordered (from `purchase_orders` table)

## Files

| File | Change |
|------|--------|
| `useSupplierSettings.ts` | Add rename, delete, stats hooks |
| `SupplierSettingsSection.tsx` | Wire search, add rename/delete UI, reorder fields, unlink confirm, reassign support, stats card |

No database migrations needed — all columns and tables already exist.

