

## Add Category & Type Reconciliation Step to Product Import Wizard

### Problem
When importing products via CSV, categories and product types from the CSV are inserted as-is. This leads to duplicates (e.g. "Haircare" vs "Hair Care"), unrecognized types, and messy data. The user needs a way to match or create categories/types before committing the import.

### Solution
Add a new **"Reconcile"** step between the existing Mapping and Preview steps, shown only for `products` imports. This step:

1. **Extracts unique category and product_type values** from the mapped CSV data
2. **Fetches existing categories** (via the `product_categories` table + products table) and existing types (Products, Merch, Extensions)
3. **Displays each unique CSV value** with a dropdown to either:
   - Match to an existing category/type
   - "Add as new" (keeps the original value and auto-creates the category in `product_categories`)
4. **Applies the reconciliation** to the CSV data before sending to the edge function

### Changes

**Edit: `src/components/admin/DataImportWizard.tsx`**

1. Add `product_type` to the products `FIELD_DEFINITIONS` (it's missing — currently products import without a type field)
2. Add a new `WizardStep` value: `'reconcile'` between `'mapping'` and `'preview'`
3. Add state for `categoryMap` and `typeMap` (Record<string, string> mapping CSV values → resolved values)
4. When transitioning from mapping → reconcile (for products only):
   - Scan mapped CSV data for unique `category` and `product_type` values
   - Fetch existing categories via `useProductCategories()` and define known types (`Products`, `Merch`, `Extensions`)
   - Pre-match exact matches, flag unmatched values
5. Render the reconcile step UI:
   - Two sections: **Categories** and **Product Types**
   - Each unique CSV value shows a `Select` with options: existing values + "Add as new"
   - Badge showing count of products with that value
6. In `handleImport`, apply the maps to transform `category` and `product_type` values before sending to the edge function
7. After a successful (non-dry-run) import, auto-create any "Add as new" categories in `product_categories`
8. Update step navigation: mapping → reconcile → preview (for products); mapping → preview (for others)
9. Update the progress indicator to show 5 steps for products imports

**No database changes, no edge function changes.** All reconciliation happens client-side before the data is sent to the existing import pipeline.

