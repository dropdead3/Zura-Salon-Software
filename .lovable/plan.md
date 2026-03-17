

# Protect Products Table from Duplicates

## Problem
The `products` table has no uniqueness constraint. Multiple entry points can create duplicate products within the same organization:
1. **SupplyLibraryDialog** — client-side `existingKeys` check is case-sensitive
2. **BackroomProductCatalogSection** — same case-sensitive `existingKeys` issue
3. **ProductWizard / useCreateProduct** — no duplicate check at all
4. **DataImportWizard / `import-data` edge function** — only catches dupes if a DB constraint exists (checks for error code `23505`)
5. **ProductEditDialog** — also uses `useCreateProduct` without dedup

## Fix — Database Constraint + Code Guards

### 1. Database migration
- Add a partial unique index on `(organization_id, lower(brand), lower(name))` where `is_active = true`
- This is the single source of truth — prevents duplicates regardless of entry point
- The `import-data` edge function already handles `23505` errors gracefully (skips duplicates), so it will work automatically

### 2. `useCreateProduct` hook (`src/hooks/useProducts.ts`)
- Before inserting, query for an existing active product with same org + brand + name (case-insensitive)
- If found, throw a user-friendly error: "A product with this name and brand already exists"
- This protects ProductWizard and ProductEditDialog

### 3. `SupplyLibraryDialog.tsx` — make `existingKeys` case-insensitive
- Change the key-building to `.toLowerCase()` in both the `existingKeys` set construction and the `sizedKey`/`isExisting` helper
- Prevents UI from allowing selection of already-added products with different casing

### 4. `BackroomProductCatalogSection.tsx` — same case-insensitive fix
- Same `.toLowerCase()` fix to `existingKeys` and `isExisting`

### 5. `import-data` edge function — add upsert logic for products
- For `products` entity type: before inserting, check for existing product with same `organization_id + lower(brand) + lower(name)`
- If found: update pricing fields (retail_price, cost_price) instead of inserting → "imports only add new products and/or update pricing"
- If not found: insert as new

### Summary of changes
| File | Change |
|---|---|
| Migration SQL | Partial unique index on `(organization_id, lower(brand), lower(name))` |
| `src/hooks/useProducts.ts` | Pre-insert duplicate check in `useCreateProduct` |
| `SupplyLibraryDialog.tsx` | Case-insensitive `existingKeys` |
| `BackroomProductCatalogSection.tsx` | Case-insensitive `existingKeys` |
| `supabase/functions/import-data/index.ts` | Upsert logic for products: update pricing if exists, insert if new |

