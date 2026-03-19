

# Remove "Order" Eyebrow from Suggested Column Header

## Problem
The "ORDER" eyebrow text stacked above "Suggested" in the table header looks awkward — it's a tiny label that adds visual noise without meaningful clarity.

## Change

**File: `StockTab.tsx` (lines 676-684)**

Replace the stacked two-line header with a single-line "Suggested" header (matching the other column headers):

- Remove the `<div className="flex flex-col items-end">` wrapper
- Remove the `<span>Order</span>` eyebrow entirely
- Keep just `Suggested` + the tooltip icon, inline like the Stock column

| File | Change |
|------|--------|
| `StockTab.tsx` | Remove "Order" eyebrow, flatten to single-line "Suggested" header |

