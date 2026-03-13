

# Professional Supply Library for Backroom Product Catalog

## Problem
The Product Catalog only shows products already in the database. New salons see an empty list with no way to add supply products. Building a catalog of 30-80 professional chemical SKUs manually is painful.

## Solution
A built-in reference library of ~26 professional brands and ~220 product lines. Users browse by brand, bulk-select, and one-click add to their catalog with tracking pre-enabled. Includes **Danger Jones** (Epilogue color line, bleach/lightener, semi-permanent vivids).

## New Files

### `src/data/professional-supply-library.ts`
Static dataset of supply products organized by brand. Each entry:
```typescript
{ brand: string; name: string; category: string; defaultDepletion: string; defaultUnit: string }
```
~26 brands including Schwarzkopf, Wella, Redken, L'Oréal Pro, Matrix, Goldwell, Pravana, Joico, Paul Mitchell, Kenra, Pulp Riot, Oligo, Guy Tang (#mydentity), TIGI, Framesi, Lakme, Keune, Rusk, CHI, Clairol Pro, Elgon, Uberliss, Olaplex, K18, **Danger Jones** (Epilogue Permanent Color, Epilogue Lightener, semi-permanent vivids line), and generic developers.

Categories: color, lightener, developer, toner, bond builder, treatment, additive.

### `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx`
Dialog component with:
- **Left panel**: Scrollable brand list with product count badges, search filter
- **Right panel**: Product lines for selected brand with checkboxes
- "Select All" per brand, "Already added" indicators (matched by name+brand)
- **Footer**: "Add X Selected Products" button → bulk inserts into `products` table with `is_backroom_tracked: true`, `product_type: 'Supplies'`, org_id set
- Quick-add custom product form at bottom for unlisted items

## Modified File

### `BackroomProductCatalogSection.tsx`
- Add "Browse Supply Library" button next to filters (always visible)
- Replace empty state with compelling CTA: "Build Your Supply Catalog" with "Browse Supply Library" primary button and "Add Custom Product" secondary
- Import and render `SupplyLibraryDialog`
- After bulk add, invalidate queries and show success toast with count

## No database changes needed
Products insert into the existing `products` table using fields already available (`name`, `brand`, `category`, `product_type`, `is_backroom_tracked`, `depletion_method`, `unit_of_measure`, `organization_id`).

