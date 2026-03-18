

## Add "Create PO" Button for Selected Items

### Problem
When items are selected in the Stock tab, the selection bar only shows a reorder button if those items have a positive `recommended_order_qty`. Since the selected items all show `—` for Reorder Qty, no action button appears — just "2 selected" and "Clear". Users expect to be able to create a PO from any selection.

### Change

**File:** `src/components/dashboard/backroom-settings/inventory/StockTab.tsx` (selection bar, lines ~417–443)

Add a "Create PO" button that always appears when items are selected, regardless of reorder quantity:

```tsx
{selectedIds.size > 0 && (
  <div className="flex items-center gap-3 ...">
    <span>...</span>
    {/* Always-visible Create PO button */}
    <Button size="sm" onClick={() => setAutoPoDialog(true)}>
      <ShoppingCart /> Create PO ({selectedIds.size} items)
    </Button>
    {/* Keep existing conditional reorder button for items with qty */}
    ...
    <Button variant="ghost" onClick={clear}>Clear</Button>
  </div>
)}
```

The existing "Reorder X items" conditional button can be removed or kept as a secondary option — the new "Create PO" button covers the general case and opens the same `AutoCreatePODialog`.

| File | Action |
|------|--------|
| `StockTab.tsx` | **Edit** — Add always-visible "Create PO" button in selection bar |

