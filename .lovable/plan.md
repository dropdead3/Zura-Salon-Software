

## Add `product_type` Column to Products

### Problem
Product type (Products, Merch, Extensions, Gift Cards) is currently inferred from the product name via regex. Users need to explicitly set the type when creating/editing products, and the type should be stored in the database for reliable filtering.

### Changes

**Database Migration** — Add `product_type` column to `products` table
- `ALTER TABLE products ADD COLUMN product_type text DEFAULT 'Products'`
- Backfill existing rows using the same regex logic: update rows matching extension/gift card/merch patterns

**`src/hooks/useProducts.ts`**
- Add `product_type` to the `Product` interface
- Add `product_type` to `ProductFilters` and query logic for server-side filtering
- Include `product_type` in `useCreateProduct` insert data

**`src/components/dashboard/settings/RetailProductsSettingsContent.tsx`**
- Add `product_type` to the form state (default `'Products'`)
- Add a "Type" `Select` field in the dialog (between Name and Brand/Category row)
- Include `product_type` in `handleSubmit` output
- Update `getProductType()` to prefer the DB column, falling back to regex inference
- Switch the table's type filter to use the DB column instead of client-side regex

### Summary
One migration + two file edits. Moves product type from fragile name-matching to an explicit, user-settable database column.

