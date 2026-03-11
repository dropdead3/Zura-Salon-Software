

## Add Inline Stock Editing to Products Tab

### What's changing
Replace the static stock count display in the Products table (line 130-134) with an inline editable input. Clicking the stock number turns it into a small number input; pressing Enter or blurring saves the new value via `updateProduct.mutate`.

### Changes

**`src/components/dashboard/settings/RetailProductsSettingsContent.tsx`** — `ProductsTab`

1. Add state: `const [editingStockId, setEditingStockId] = useState<string | null>(null)` and `const [stockValue, setStockValue] = useState('')`

2. Replace the Stock `<TableCell>` (lines 130-135) with:
   - **Default state**: Show the stock number as a clickable element (cursor-pointer, subtle hover underline). Clicking sets `editingStockId` to the product id and `stockValue` to the current quantity.
   - **Editing state**: Show a small `<Input type="number">` (w-16, h-7, text-right). On blur or Enter, call `updateProduct.mutate({ id, updates: { quantity_on_hand: parseInt(stockValue) } })` and clear `editingStockId`. On Escape, cancel.
   - Preserve the low-stock amber styling and warning triangle icon in both states.

No new dependencies. Uses the existing `updateProduct` mutation already in scope.

