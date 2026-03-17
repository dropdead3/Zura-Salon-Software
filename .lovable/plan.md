

# Bi-Directional Retail / Markup Calculation

## What Changes

Both the **Edit Product dialog** (in `SupplyLibraryTab.tsx`) and the **Bulk Pricing dialog** (`SupplyBulkPricingDialog.tsx`) need a new **Retail Price** input field that works bi-directionally with the Markup % field:

- **Markup % changed** → auto-compute Retail: `wholesale * (1 + markup / 100)` and update the Retail input
- **Retail changed** → auto-compute Markup: `((retail / wholesale) - 1) * 100` and update the Markup input
- If wholesale is empty/zero, both derived fields stay blank (no division by zero)
- A `lastEdited` flag (`'markup'` | `'retail'`) tracks which field the user touched last, so the other one recalculates without creating a feedback loop

## Layout

Replace the current read-only retail preview with an editable input in a 3-column grid:

```text
Wholesale Price    Markup %     Retail Price
[  8.65  ]         [ 100  ]     [ 17.30  ]
                   50% 75% 100%
```

The markup preset buttons (50%, 75%, 100%) still set the markup field and trigger a retail recalculation.

Below the row, keep the helper text: "Clients are charged this rate per unit for overage beyond the service allowance."

## Files Changed

| File | Change |
|------|--------|
| `SupplyLibraryTab.tsx` (AddEditDialog, lines 1066-1197) | Add `retailPrice` state + `lastEdited` tracker; change the 2-col wholesale/markup grid to 3-col with retail input; add `useEffect` for bi-directional sync |
| `SupplyBulkPricingDialog.tsx` | Same pattern — add editable retail input replacing the read-only preview; add bi-directional sync; keep markup presets |

## Save Logic

On save, `recommended_retail` is always recomputed from `wholesale * (1 + markup / 100)` to ensure consistency — even if the user typed retail directly, the stored markup is the source of truth.

