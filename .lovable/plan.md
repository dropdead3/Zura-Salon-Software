

## Add Create & Delete Categories to the Categories Tab

### Current State
- Categories are derived dynamically from the `products.category` column — there is no dedicated categories table.
- The Categories tab shows summaries (product count, stock, value) grouped by the `category` field.
- Renaming a category bulk-updates all products with that category name.
- Products with `null` category already show as "Uncategorized" in the summaries.

### Approach
Since categories are stored as a string field on the `products` table (no separate categories table), we keep this pattern and implement:

1. **Create Category** — A standalone category doesn't map to a row anywhere, so we'll use the existing `CategoryFormDialog` component. Creating a category is conceptual — it becomes available once at least one product uses it. However, to allow "empty" categories to exist before products are assigned, we'll add a dedicated `product_categories` table to persist category names.

**Actually, simpler approach**: Keep the current derived-from-products pattern. "Create Category" will open a dialog to name a new category, which then filters into the category dropdown options in product forms. We store standalone categories in a lightweight `product_categories` table so they persist even when empty.

2. **Delete Category** — Bulk-update all products in that category to `category = null` (making them "Uncategorized"), then remove from the `product_categories` table if it exists there.

3. **Uncategorized** — Already handled by the summaries hook (`p.category || 'Uncategorized'`). Products without a category naturally appear in this group.

### Database Migration

Create a `product_categories` table to persist category names independently of products:

```sql
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view categories"
  ON public.product_categories FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins can manage categories"
  ON public.product_categories FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
```

### Code Changes

**New hook: `src/hooks/useProductCategoryManagement.ts`**
- `useCreateProductCategory()` — inserts into `product_categories`
- `useDeleteProductCategory(name)` — bulk-updates products with that category to `null`, then deletes from `product_categories`
- Update `useProductCategories` to merge categories from both the `products` table and `product_categories` table

**Edit: `src/hooks/useProducts.ts`**
- Update `useProductCategories()` to also query `product_categories` and merge/dedupe with product-derived categories

**Edit: `src/components/dashboard/settings/RetailProductsSettingsContent.tsx` → `CategoriesTab`**
- Add a "New Category" button (top-right, using the existing `CategoryFormDialog`)
- Add a delete button per category row (with confirmation dialog) — deleting sets all products in that category to uncategorized
- "Uncategorized" row is not deletable or renameable (already handled for rename)

**Reuse: `src/components/dashboard/settings/CategoryFormDialog.tsx`** — already exists with create/rename modes and duplicate detection

### Files
- 1 new DB table (`product_categories`)
- 1 new file: `src/hooks/useProductCategoryManagement.ts`
- 2 edited files: `RetailProductsSettingsContent.tsx`, `useProducts.ts`

