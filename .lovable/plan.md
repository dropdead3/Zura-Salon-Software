

## Redesign: Two-Panel Allowance Calculator

### Current Problem
The product picker is embedded inside each bowl card, creating a tall single-column layout. When a bowl is empty, the user sees a large empty state + picker stacked vertically. Browsing products hides the recipe, and vice versa.

### Proposed Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCT ALLOWANCE CALCULATOR  ⓘ                            ✕  │
│  Extension Consultation — benchmarks to set dollar allowance    │
├──────────────────────────┬──────────────────────────────────────┤
│  PRODUCT PICKER          │  RECIPE                             │
│                          │                                     │
│  [Active Bowl: Bowl 1 ▼] │  ┌─ Bowl 1 ──────────────────────┐  │
│                          │  │  Product A   30g  $2.40    ✕   │  │
│  🔍 Search brands...     │  │  Product B   45g  $3.10    ✕   │  │
│  ┌──────────────────┐    │  │  ── Developer ──               │  │
│  │ Danger Jones  191 │    │  │  Dev 20vol  1×    $1.20    ✕   │  │
│  │ Redken        84  │    │  │  Bowl Total: 105g · $6.70     │  │
│  │ Wella         62  │    │  └────────────────────────────────┘  │
│  └──────────────────┘    │                                     │
│                          │  [+ Add Bowl]                       │
│                          │                                     │
├──────────────────────────┴──────────────────────────────────────┤
│  Total Allowance (Retail)                     [Save Allowance] │
│  $6.70  ·  105g across 1 vessel  ·  Service $15               │
│  ██ 8.2% of service — within target range                     │
└─────────────────────────────────────────────────────────────────┘
```

### Changes

**File: `src/components/dashboard/color-bar-settings/AllowanceCalculatorDialog.tsx`**

**1. Split the content area into two panels**
Replace the single-column `div.px-6.py-4.space-y-4` with a `flex` row:
- **Left panel (w-[320px], sticky):** Contains a bowl selector dropdown (to target which bowl receives products) and the brand/category/product picker. This panel is always visible regardless of scroll position on the right.
- **Right panel (flex-1, overflow-y-auto):** Contains the bowl cards with their product lines, weight presets, developer ratios, and subtotals. Also contains the "+ Add Bowl" button.

**2. Lift the picker out of individual bowls**
- Remove the per-bowl `renderPickerPanel()` call from inside each bowl card
- Create a single shared picker state (`activeBowlIdx`) that determines which bowl receives added products
- The picker lives in the left panel permanently; a small dropdown or tab strip at the top of the left panel lets users switch the target bowl

**3. Bowl selector in left panel**
- When only 1 bowl exists, show "Bowl 1" as a static label
- When multiple bowls exist, show pill-style tabs or a Select dropdown
- Adding a product always targets the selected bowl

**4. Simplify bowl cards (right panel)**
- Remove the inline picker and empty-state illustration from each bowl card
- Bowl cards become compact: just the header + product lines + subtotal
- Empty bowls show a single line: "Select products from the left panel"

**5. Responsive behavior**
- Below `md` breakpoint, stack the panels vertically (picker on top, bowls below) to preserve mobile usability
- Left panel gets `overflow-y-auto max-h-[60vh]` to handle long brand lists

**6. No logic changes**
All add/remove/quantity/ratio/save logic remains identical. This is purely a layout restructure — the picker functions, bowl state, and save flow are untouched.

### Technical Details

- Dialog `max-w` increases from `max-w-4xl` to `max-w-5xl` to accommodate the side-by-side layout
- Left panel: `w-[320px] border-r border-border/40 p-4 overflow-y-auto`
- Right panel: `flex-1 p-4 overflow-y-auto`
- `bowlPickers` state collapses into a single `pickerState` + `activeBowlIdx` (simplifies from `Record<number, PickerState>` to just `PickerState`)
- The per-bowl picker rendering logic in `renderPickerPanel()` stays the same but is called once for the left panel instead of N times inside bowls

### Result
- Product picker is always visible — no scrolling to find it
- Recipe is always visible — users see their running total while browsing
- Empty bowls are compact (one line vs. large empty state)
- Reduces vertical scroll significantly
- Matches the "pinned flexbox" pattern from project memory

