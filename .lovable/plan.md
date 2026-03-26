

## Make Product Rows Clickable with Checkbox

### What Changes

In the product picker list (lines 564-611 of `AllowanceCalculatorDialog.tsx`), replace the current `+ Add` / `✓ Added` button with a checkbox, and make the entire row clickable to toggle add/remove.

### Changes to `AllowanceCalculatorDialog.tsx`

**Lines 568-608** — Rework each product row:

1. Wrap the entire row `div` with an `onClick` handler that calls `addProductToBowl(bowlIdx, p)` (which already toggles if the product is added)
2. Add `cursor-pointer` to the row and adjust hover styling
3. Replace the `Button` (lines 588-608) with a `Checkbox` component:
   - `checked={isAlreadyAdded}`
   - Styled to match the existing design (`shrink-0`)
   - Click handled by the parent row's `onClick` — no separate handler needed
4. Add `import { Checkbox } from '@/components/ui/checkbox'` (if not already imported)

### Verify: Does `addProductToBowl` toggle?

Need to check if calling it on an already-added product is safe or if we need to add removal logic.

