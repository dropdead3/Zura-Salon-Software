

# Polish Swatch Circle Borders

## Problem
The trigger button uses a `2px solid` border via inline `style` when a color is selected, which looks unrefined — especially on the dark platform theme. The dashed border for suggestions is also rough.

## Changes

**File:** `src/components/platform/backroom/SwatchPicker.tsx`

Replace the inline `border` style approach on the trigger button with a clean, borderless swatch that uses a subtle `box-shadow` ring instead:

- **Saved swatch (has value):** Remove the `2px solid` border. Use `box-shadow: 0 0 0 1.5px rgba(255,255,255,0.15)` (a soft inset-like ring that works on dark backgrounds without clashing with the swatch color).
- **Suggested swatch (no value, has suggestion):** Keep the dashed border only via a Tailwind class (`border-2 border-dashed border-muted-foreground/40 opacity-50`) instead of inline styles, for consistency.
- **Empty swatch (no value, no suggestion):** Keep the existing dashed outline circle as-is (already looks intentionally empty).

Also in the popover grid, the selected swatch uses `ring-2 ring-violet-500` which is fine — no change needed there.

