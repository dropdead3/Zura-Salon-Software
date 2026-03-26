

## Add "Add Another Product" Button Alongside "Done Adding"

Great call — this is a much more intuitive flow. Right now "Done Adding" loops back to brand selection, which is confusing. Splitting into two actions makes the intent clear.

### Changes (`AllowanceCalculatorDialog.tsx`)

**1. Add `closed` step to PickerState** — Update the `step` type from `'brand' | 'category' | 'product'` to `'brand' | 'category' | 'product' | 'closed'`. This lets the picker be hidden after the user clicks "Done Adding".

**2. Add an "Add Products" button when picker is closed** — When `step === 'closed'`, render a small outline button (e.g., `+ Add Products`) so the user can reopen the picker to brand selection.

**3. Replace the single "Done Adding" button with two buttons** — At the product step (line 674–682), replace the single button with a row of two:

| Button | Style | Action |
|--------|-------|--------|
| Add Another Product | `variant="outline"` | Navigates back to brand selection (`step: 'brand'`) |
| Done Adding | `variant="default"` | Closes the picker (`step: 'closed'`) |

```tsx
<div className="flex gap-2">
  <Button
    variant="outline"
    size="sm"
    className="flex-1 h-8 text-xs"
    onClick={() => setPickerState(bowlIdx, { step: 'brand', selectedBrand: null, selectedCategory: null, search: '' })}
  >
    + Add Another Product
  </Button>
  <Button
    size="sm"
    className="flex-1 h-8 text-xs"
    onClick={() => setPickerState(bowlIdx, { step: 'closed' })}
  >
    Done Adding
  </Button>
</div>
```

**4. Handle `closed` in `renderPickerPanel`** — Return a compact "Add Products" button when step is `closed`, so the user can always get back to the picker.

### Files

| File | Change |
|------|--------|
| `AllowanceCalculatorDialog.tsx` | Add `closed` step, split buttons, add reopen button |

