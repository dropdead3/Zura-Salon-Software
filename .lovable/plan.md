

## Fix: Allow Adding Multiple Products to a Bowl

### Problem
The product picker currently works as a drill-down (Brand → Category → Product), but after clicking "Add" on a product, the picker stays in place — however it's not obvious the product was added, and there's no visual feedback keeping the user in "adding mode." The user wants to add multiple color products to a single bowl without navigating back and forth.

### Changes — `AllowanceCalculatorDialog.tsx`

1. **Keep picker open after adding** — The picker already stays on the product list after clicking "Add." The fix is to make it obvious: change the "Add" button to a checkmark/badge ("✓ Added") for products already in the bowl, and keep the Add button visible (not `opacity-0`) so it's always tappable.

2. **Show "added" state on product rows** — When a product is already in the current bowl's lines, show a green check and "Added" label instead of "+ Add". Allow clicking again to add a second instance (some formulas use the same product twice at different weights).

3. **Make Add button always visible** — Remove the `opacity-0 group-hover:opacity-100` classes so the Add button is always shown, not hidden until hover (mobile users can't hover).

4. **Show live ingredient count in picker header** — Add a small counter next to the breadcrumb showing how many products have been added to this bowl (e.g., "3 added").

5. **Add "Done Adding" button** — At the bottom of the product list, show a "Done" button that resets the picker back to the brand step, giving users a clear way to finish adding from one category and move to another or close the picker.

### Files Modified
- `src/components/dashboard/backroom-settings/AllowanceCalculatorDialog.tsx`

