

# Move PDF Button Next to Location Filter

## Problem
The PDF download button is buried inside the inventory table's filters row. The user wants it next to the location selector in the section header for quicker access.

## Changes — Two files

### 1. `BackroomInventorySection.tsx`
- Accept `onPdfExport`, `exporting`, and `filteredCount` as props passed up from `StockTab` (or handle PDF export at this level).
- Actually, simpler: just pass the PDF button as a sibling to the location `Select` in the header row (lines 84-101).
- But the PDF logic lives in `StockTab`. Cleanest approach: lift the PDF button out of StockTab's filters row and place it in the parent header next to the location picker.

**However**, the PDF export depends on `StockTab` internal state (filtered products, location, etc.). Lifting that state is complex.

**Simpler approach**: Move the PDF button from the filters row (lines 619-628 in StockTab) into the decision header row (line 521) — right after the location filter. But location filter is in the parent...

**Simplest approach**: Keep PDF in `StockTab.tsx` but move it from the filters row to the decision header row, placing it at the far right. The location filter is in the parent component header, so the closest inline position within StockTab is the top of the card. Let me re-read the screenshot — the user sees PDF and the sliders button side by side below the decision header. They want PDF next to the location toggle (which is in the parent section header, next to "Inventory Management" title).

I'll move the PDF button from StockTab's filters row up to the parent `BackroomInventorySection.tsx` header, next to the location selector. This requires passing the export handler and state up via a ref or callback pattern.

**Most pragmatic**: Use a callback ref or expose export via a ref. Actually even simpler — just move the PDF button to sit right next to the location dropdown in the parent by having StockTab expose an `onExportPdf` callback via a prop that the parent provides, and render the PDF button in the parent.

Let me check what `handlePdfExport` needs from StockTab state.

## Revised Simpler Approach

Move the PDF button from the filters/actions row (line 619-628) into the decision header row (line 521-584), placing it at the right end alongside the "Review Items" and "Auto Build PO" buttons. This keeps it at the top of the card, visually adjacent to the location selector which sits just above in the parent header. No cross-component state lifting needed.

### `StockTab.tsx`
1. **Remove** the PDF button from the filters row (lines 619-628)
2. **Add** the PDF button into the decision header row (line 553, inside the `shrink-0` div with "Review Items" and "Auto Build PO"), or in the healthy-state row

This places it at the card's top-right, directly below the location selector — the closest visual proximity without complex refactoring.

| File | Change |
|------|--------|
| `StockTab.tsx` | Move PDF button from filters row (L619-628) to decision header row (L553-571) |

