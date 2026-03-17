

## Redesign "Set Pricing" Dialog to Match Vish "Set Category Pricing"

The Vish reference shows a cleaner field layout with:
- Fields renamed: "Wholesale Price" (with `$` suffix), "Markup" (with `%` suffix), "Retail Price" (with `$` suffix, auto-calculated), "Container Size" (with `g` suffix)
- Floating-label-style inputs with unit suffixes inside the input border
- Retail Price is a computed/read-only field derived from wholesale and markup
- Single "Save" button instead of Cancel + Apply

### Changes to `BackroomBulkPricingDialog.tsx`

1. **Rename fields** to match Vish terminology:
   - "Cost per Gram ($)" → "Wholesale Price" with `$` suffix badge
   - "Markup %" → "Markup" with `%` suffix badge
   - Add new **read-only "Retail Price"** field (auto-calculated: `wholesale × (1 + markup/100)`) with `$` suffix
   - "Container Size (optional)" → "Container Size" with `g` suffix badge

2. **Input styling**: Each input gets a right-aligned unit suffix indicator (`$`, `%`, `g`) rendered inside the input area, replacing the external labels with placeholder-as-label pattern.

3. **Update DB field mapping**: "Wholesale Price" maps to `cost_price` (the whole-container wholesale cost) instead of `cost_per_gram`. Retail maps to a computed display only (or optionally stored).

4. **Footer**: Replace Cancel + Apply buttons with a single full-width "Save" button. Keep the scope description in the header.

5. **Remove** the old "Charge per gram" preview since retail price field now serves that purpose inline.

### Technical Details

- The `wholesale_price` field should update `cost_price` on the products table
- Retail Price = `wholesalePrice * (1 + markupPct / 100)`, displayed read-only
- Container Size changes from free text to numeric with `g` (grams) unit
- Mutation updates: `cost_price`, `markup_pct`, `container_size`

