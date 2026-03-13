

# Add Size/Volume Variants to Supply Library

## Approach

Add an optional `sizeOptions` array to each library item. In the dialog, when a user selects a product that has size variants, they pick which sizes to add — each size becomes a separate product row in the catalog (e.g., "Igora Royal Permanent Color — 60ml" and "Igora Royal Permanent Color — 120ml").

## Changes

### 1. `src/data/professional-supply-library.ts`
- Add `sizeOptions?: string[]` to the `SupplyLibraryItem` interface
- Add size arrays to products where applicable:
  - **Color tubes**: `['60ml', '120ml']` (industry standard sizes)
  - **Lighteners/bleach powder**: `['450g', '900g']` (tub sizes)
  - **Developers**: `['500ml', '1000ml']` (bottle sizes)
  - **Bond builders/treatments**: `['100ml', '500ml']` (bottle sizes)
  - **Toners/glosses**: `['60ml']` (single size typical)
  - **Semi-permanents/vivids**: `['90ml', '118ml']` (varies by brand)
- Products without `sizeOptions` remain as-is (added without a size suffix)

### 2. `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx`
- Change the selection model: when a product has `sizeOptions`, each size is independently selectable. The key becomes `brand::name::size` instead of `brand::name`.
- In the product row, show size chips/checkboxes inline under the product name so users can pick "60ml", "120ml", or both.
- On insert, append the size to the product name: `"Igora Royal Permanent Color — 60ml"` and include size info in a description or the name itself.
- Update `existingKeys` matching to account for size-suffixed names.
- Products without sizes continue to work as before (single checkbox, no size picker).

## Files

| File | Action |
|------|--------|
| `src/data/professional-supply-library.ts` | Add `sizeOptions` to interface + populate sizes on ~140 items |
| `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx` | Size-aware selection model, inline size chips, size-suffixed insert |

