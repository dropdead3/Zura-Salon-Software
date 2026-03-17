

## Pre-populate Swatches, Pricing and Markups from Supply Library

### Problem
When products are added from the Supply Library to an org's catalog, only basic fields (name, brand, category, depletion, unit) are copied. The supply library DB has `wholesale_price`, `default_markup_pct`, `swatch_color`, and `container_size` data, but none of it flows through to the org's `products` table. The product table also lacks a `swatch_color` column entirely.

### Plan

#### 1. Database migration — add `swatch_color` to `products` table
- Add `swatch_color TEXT` column to the `products` table so org products can store their color swatch (pre-populated from library, overridable by user).

#### 2. Extend `SupplyLibraryItem` interface and mapping
- In `src/data/professional-supply-library.ts`, extend `SupplyLibraryItem` with optional fields: `wholesalePrice`, `defaultMarkupPct`, `swatchColor`, `containerSize`.
- In `src/hooks/platform/useSupplyLibrary.ts`, update the `useSupplyLibraryItemsByBrand` mapping to carry through `wholesale_price → wholesalePrice`, `default_markup_pct → defaultMarkupPct`, `swatch_color → swatchColor`, and `size_options` → `containerSize` (first size option).

#### 3. Pre-populate pricing and swatch on product insert
- In `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx`, update both `handleAdd` and `handleAddEntireBrand` to look up the matching library item and include:
  - `cost_price` ← `wholesalePrice`
  - `markup_pct` ← `defaultMarkupPct`
  - `swatch_color` ← `swatchColor`
  - `container_size` ← size from the selected variant or first size option
- This means products arrive in the catalog with swatches filled and pricing pre-set.

#### 4. Update catalog query and display to show swatch_color
- In `BackroomProductCatalogSection.tsx`:
  - Add `swatch_color` to the `select()` query (line 128).
  - The display code at line 694 already reads `(p as any).swatch_color` — it will now resolve properly.

#### 5. Inline editing for cost, markup, and swatch overrides
- The existing catalog table already shows Wholesale/Markup/Retail columns (lines 665-667) as read-only text.
- Convert these three cells to inline-editable: clicking a price cell opens a small input that saves via the existing `updateMutation`.
- Add a `SwatchPicker` (already used in `SupplyLibraryTab.tsx`) to the swatch column so org users can override the pre-populated color.

### Technical details

**Migration SQL:**
```sql
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS swatch_color text;
```

**Data flow:**
```text
supply_library_products (wholesale_price, default_markup_pct, swatch_color)
  → SupplyLibraryItem (extended interface)
    → handleAdd / handleAddEntireBrand (maps to products insert)
      → products table (cost_price, markup_pct, swatch_color, container_size)
        → BackroomProductCatalogSection (displays + inline edit)
```

**Inline edit approach:** Each pricing cell becomes a click-to-edit field using a small `<Input>` that appears on click, commits on blur/Enter, and calls `updateMutation` with the changed field. This keeps the existing table layout clean while enabling overrides.

