

## Add "Assign Supplier" Button in Auto Create PO Warning

### Problem
When the Auto Create PO dialog shows "X products without supplier," there's no way to assign a supplier without closing the dialog and finding the brand header. Users should be able to fix this inline.

### Approach
The unassigned products share brand info (each `BackroomInventoryRow` has a `brand` field). Group unassigned products by brand, then render an "Assign Supplier" button per brand that opens the `SupplierAssignDialog` directly from within the `AutoCreatePODialog`.

### Changes

**File:** `AutoCreatePODialog.tsx`

1. Add state for an inline supplier dialog: `{ open, brand, products }`
2. Import `SupplierAssignDialog`
3. In the unassigned warning section, group products by brand and render a small "Assign Supplier" button per brand (or a single button if all are the same brand)
4. Render `<SupplierAssignDialog>` at the bottom of the dialog
5. On supplier save success, the query invalidation will refresh the product data, so the dialog will re-render with updated supplier assignments

**Props change:** The `AutoCreatePODialog` already receives `products` with brand info — no prop changes needed.

### Files

| File | Action |
|------|--------|
| `AutoCreatePODialog.tsx` | **Edit** — Add inline supplier assignment from warning block |

