

## Add "Mix from History" to New Bowl Sheet

### Overview
Add a third action button in the New Bowl footer that opens a formula history picker. Selecting a past formula pre-populates the bowl's ingredient lines, letting stylists quickly recreate previous mixes.

### Design
The New Bowl sheet footer currently has two buttons: "Add Product" and "Create Bowl". A third button — "Mix from History" (with a History icon) — will be added. Tapping it opens a sub-view within the sheet showing the client's formula history (reusing the same data from `useClientFormulaHistory`). Each formula card is tappable and selecting one loads its ingredients into the builder.

### Changes

**1. `src/components/dock/mixing/DockNewBowlSheet.tsx`**
- Add `clientId` prop to the interface (needed to fetch formula history)
- Add state: `showHistoryPicker` (boolean)
- When `showHistoryPicker` is true, render a `DockFormulaHistoryPicker` inline (replaces the formula builder area temporarily)
- Add "Mix from History" button in footer row — 3-column layout: Add Product | Mix from History | Create Bowl
- On formula select: map `ClientFormula.formula_data` (which uses `FormulaLine` from mix-calculations) into `DockFormulaBuilder`'s `FormulaLine` format (need to resolve products or create lightweight entries), set lines + close picker

**2. New file: `src/components/dock/mixing/DockFormulaHistoryPicker.tsx`**
- A compact list of past formulas for the current client (fetched via `useClientFormulaHistory`)
- Each row shows: service name, date, stylist, ingredient summary
- Tapping a row calls `onSelect(formula)` with the full `ClientFormula`
- Back button to return to the builder
- Reuses DOCK_SHEET styling tokens, large touch targets (py-4 rows)

**3. `src/components/dock/appointment/DockServicesTab.tsx`**
- Pass `appointment.client_id` to `DockNewBowlSheet` as the new `clientId` prop

### Formula data mapping
`ClientFormula.formula_data` uses `FormulaLine` from `mix-calculations` (product_id, product_name, brand, quantity, unit). The `DockFormulaBuilder` uses its own `FormulaLine` type (product: DockProduct, targetWeight, ratio). On select, each history line will be mapped to a builder line with a synthetic `DockProduct` (id, name, brand from history data) and quantity as targetWeight, ratio 1x. This preserves the formula accurately without requiring a product catalog lookup.

### Files
- `src/components/dock/mixing/DockNewBowlSheet.tsx` — add clientId prop, history picker toggle, footer button
- `src/components/dock/mixing/DockFormulaHistoryPicker.tsx` — new component
- `src/components/dock/appointment/DockServicesTab.tsx` — pass clientId prop

