

# Section 12 — Interaction + UX Polish

## Goal
Refine hover states, transitions, and layout stability across all inventory components. No heavy animations — subtle, intentional, Apple-grade feel per the motion standards (120-160ms hovers, no bounce/elastic).

## Changes

### 1. CommandCenterRow.tsx — Row interactions
- **Row hover**: Add consistent `transition-colors duration-150` (currently has `transition-colors` but no duration). Ensure severity-tinted hover backgrounds don't flicker.
- **Expand/collapse chevron**: Add `transition-transform duration-150` rotation instead of swapping icons (ChevronRight → ChevronDown). Use a single ChevronRight with `rotate-90` when expanded.
- **Expanded detail row**: Wrap in a smooth height reveal using CSS `grid-rows` animation (no framer-motion overhead). Add `animate-in fade-in duration-150` for the content.
- **Inline edit cells**: Add `transition-all duration-150` on border color changes. Ensure input doesn't cause layout shift by matching the exact width/height of the display span.
- **Action buttons**: The audit button already has `opacity-0 group-hover/row:opacity-100` — add `duration-150` to the transition. Ensure "Add to PO" / "Added" buttons don't shift width on state change (use consistent min-width).
- **Severity bar**: Add `transition-opacity duration-150` so it doesn't pop in/out harshly during filter changes.

### 2. StockTab.tsx — Layout stability
- **Sticky bulk action bar**: Add `animate-in slide-in-from-bottom-2 duration-200` and `animate-out` for smooth entry/exit. Ensure it doesn't cause content reflow (it's already sticky, just verify no jump).
- **Summary chips**: Add `transition-all duration-150` for active state changes (border + background color).
- **Supplier section headers**: Ensure chevron rotation transition matches CommandCenterRow pattern.
- **Table column widths**: Add explicit `w-` constraints to prevent columns from shifting when data loads or rows expand. Key columns: Stock (`w-20`), Suggested Order (`w-28`), Status (`w-24`), Cost (`w-20`), Actions (`w-24`).

### 3. POBuilderPanel.tsx — Panel polish
- **Panel entrance**: Replace `animate-in slide-in-from-right` with the canonical spring from `PremiumFloatingPanel` or at minimum use `duration-200 ease-out` for consistency.
- **Supplier card hover**: Already has `hover:bg-muted/40 transition-colors` — add `duration-150`.
- **Qty stepper buttons**: Add `transition-colors duration-120` to +/- buttons. Ensure the input doesn't shift layout when value changes digit count (use `tabular-nums` — already present).
- **Remove button fade**: Already has `opacity-0 group-hover/line:opacity-100 transition-opacity` — add `duration-150`.
- **Empty state**: Ensure centered and doesn't shift when items are added.

### 4. Overflow & Scrolling
- **Table container**: Verify the Card wrapping the Table doesn't produce double scrollbars. Add `overflow-hidden` to the Card if needed, relying on the Table's own `overflow-auto` wrapper.
- **PO Builder ScrollArea**: Already uses ScrollArea — verify no horizontal overflow from long product names (truncation is in place).
- **Bulk action bar**: Verify `sticky bottom-0` works correctly within the scrollable layout and doesn't overlap footer content.

### 5. Category sub-headers
- Add `transition-colors duration-150` to category row hover for consistency with supplier headers.

## Files Changed
| File | Change |
|------|--------|
| `CommandCenterRow.tsx` | Transition durations, chevron rotation, expand animation, layout-stable edit cells, action button widths |
| `StockTab.tsx` | Column width constraints, summary chip transitions, bulk bar animation, supplier chevron rotation |
| `POBuilderPanel.tsx` | Panel entrance timing, stepper transitions, consistent durations |

## Principles
- All hover transitions: 150ms
- No framer-motion for row-level micro-interactions (CSS only)
- No layout shifts — fixed column widths, min-widths on toggling buttons
- Stable rendering — no content jump on expand/collapse

