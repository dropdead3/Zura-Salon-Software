

## Add Type Editing to the Categories Tab

### Problem
The "Type" column in the Categories tab currently displays read-only badges showing the product types (Products, Extensions, Merch) of items in each category. There's no way to change the type for a category's products.

### Solution
Add a clickable type selector on each category row that bulk-updates the `product_type` of all products in that category.

### Changes

**Edit: `src/components/dashboard/settings/RetailProductsSettingsContent.tsx`**

Replace the static Type badges in the Categories table with an inline `Select` dropdown:
- Clicking the Type cell opens a dropdown with the three options: Products, Extensions, Merch
- Selecting a new type triggers a bulk update of all products in that category to the chosen `product_type`
- Use the existing `useBulkUpdateProducts` hook (already imported) to perform the bulk update with `field: 'product_type'`
- For categories with 0 products or "Uncategorized", show the badges as read-only (no dropdown)
- The select is styled compact (small/inline) to match the table density

**Edit: `src/hooks/useBulkUpdateProducts.ts`** (if needed)
- Verify the bulk update hook supports updating by category filter (update all products where `category = X` to set `product_type = newValue`). If it only supports field-to-field renaming, add a `bulkUpdateByCategory` variant.

### No database changes needed
Product type is already a column on the `products` table. This is purely a UI + mutation change.

