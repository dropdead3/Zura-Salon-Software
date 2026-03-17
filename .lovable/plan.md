

# Fix Supply Library Pricing: Markup % Instead of Fixed Retail

## Problem

The `SupplyBulkPricingDialog` currently has a "Recommended Retail ($)" field, but the actual business model is markup-based:

1. Organization sets **Wholesale Price** per container and a **Markup %**
2. Retail price is derived: `wholesale × (1 + markup / 100)`
3. Overage charge = `(retail_price / container_grams) × overage_grams`

The org-level `BackroomBulkPricingDialog` already does this correctly (cost_per_gram + markup_pct + container_size). The supply library version needs to match.

## Database Change

Add `default_markup_pct` column to `supply_library_products`:

```sql
ALTER TABLE supply_library_products 
ADD COLUMN default_markup_pct numeric DEFAULT 0;
```

Keep `recommended_retail` as a computed display value (no removal — backward compat).

## File Changes

### `SupplyBulkPricingDialog.tsx` — Rework fields
- Replace "Recommended Retail ($)" input with **"Markup %"** input (with quick-set buttons: 50%, 75%, 100%)
- Add a **live preview** showing computed retail price: `wholesale × (1 + markup / 100)`
- Add optional **Container Size** field (text, e.g. "60g", "2oz") — writes to `size_options` or a new field
- Mutation writes `wholesale_price`, `default_markup_pct`, and auto-computes `recommended_retail` from the two
- Add helper text explaining: "Clients are charged this rate per gram for overage beyond the service allowance"

### `SupplyLibraryTab.tsx` — Update table column
- Change the "Retail" column to show computed retail (`wholesale × (1 + markup/100)`) with the markup % as a subtle badge
- Ensure inline editing supports markup_pct where applicable

### Overage Charge Flow (documentation/alignment)
The existing `calculateOverageCharge` + `calculateProductCostCharge` in `allowance-billing.ts` already handle this math correctly. The supply library just needs to feed the right defaults when org products are created from the catalog.

