

# Remove PO Builder — Simplify to Single PO Action

## Problem
Three overlapping PO workflows confuse users:
1. "Add Selected to PO" → stages in PO Builder panel → submit from panel
2. "Auto Build PO" → dialog → creates POs directly
3. The table itself already shows supplier grouping, quantities, and costs

The PO Builder panel is a redundant middle layer.

## Approach: Remove PO Builder, Unify Around Auto Build PO

- **Remove** the PO Builder panel entirely (slide-out panel + button + all staging state)
- **Replace** "Add Selected to PO" in the selection bar with **"Create PO"** that opens `AutoCreatePODialog` with just the selected products
- **Keep** "Auto Build PO" in the actions row — it opens the same dialog with ALL reorder-eligible products
- Net result: one dialog, two entry points (selected items vs all items)

### What gets removed
- `POBuilderPanel` component usage (the slide-out panel)
- `poItemIds`, `poBuilderOpen`, `qtyOverrides`, `toggleAddToPo`, `handleQtyOverride` state
- "PO Builder" button in the actions row
- `stageSupplierToPo` function

### What changes
- Selection bar: "Add Selected to PO" → "Create PO" button that opens `AutoCreatePODialog` with `selectedReorderProducts`
- Need a second state for the dialog to distinguish "selected only" vs "all items" mode

### Files changed
- **`StockTab.tsx`**: Remove PO Builder state/panel, rewire selection bar button
- **`POBuilderPanel.tsx`**: No longer imported (can be deleted later)
- **`CommandCenterRow.tsx`**: Remove `addedToPo` / `onToggleAddToPo` props if present

**~1 file edited, significant state cleanup.**

