

## Inline Action Buttons for New Bowl Sheet

### Problem
The "+ Add Product" and "Create Bowl" buttons are stacked as full-width skinny bars, making them harder to tap quickly in a fast-paced salon workflow.

### Solution
Move the "Add Product" button out of `DockFormulaBuilder` and into `DockNewBowlSheet`'s footer alongside "Create Bowl". Both become large rectangular buttons on the same row.

### Changes

**1. `src/components/dock/mixing/DockFormulaBuilder.tsx`**
- Remove the "+ Add Product" button (lines 128–135) from the builder
- Expose `pickerOpen` / `setPickerOpen` via new props (`onOpenPicker`) OR move the `DockProductPicker` to the parent
- Simplest: add an `onAddProductClick` callback prop, keep picker in builder but triggered externally

**2. `src/components/dock/mixing/DockNewBowlSheet.tsx`**
- Replace the single full-width "Create Bowl" button with a two-column row:

```
┌─────────────────┐  ┌─────────────────┐
│   + Add Product  │  │  Create Bowl (1) │
│    (dashed border)│  │   (violet solid) │
└─────────────────┘  └─────────────────┘
```

- Both buttons: `h-14 rounded-xl flex-1` — large rectangular touch targets
- "+ Add Product": dashed violet border, violet/10 bg (same style as current, just rectangular)
- "Create Bowl": solid violet-600 bg, white text
- Row: `flex gap-3`

### Implementation detail

The cleanest approach: add an `onAddProductClick` prop to `DockFormulaBuilder` and an `addProductButton={false}` prop to hide the built-in button. The parent sheet renders both action buttons in its footer and calls `setPickerOpen(true)` on the builder via a ref or by lifting the picker state.

Simpler alternative: lift `pickerOpen` state to the parent. Pass `pickerOpen` and `onPickerClose` + `onAddProducts` down. This keeps the picker rendering in the builder but control in the parent.

### Files changed
1. `src/components/dock/mixing/DockFormulaBuilder.tsx` — add `showAddButton` prop (default true), so parent can hide it
2. `src/components/dock/mixing/DockNewBowlSheet.tsx` — move footer to 2-column layout with Add Product + Create Bowl, manage picker open state

