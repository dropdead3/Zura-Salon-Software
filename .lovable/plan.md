

## Problem

The tip percentage buttons (15%, 20%, 30%) in the S710 simulator are laid out in a horizontal row (`grid-cols-3`). The user wants them stacked vertically, spanning the full width of the screen with appropriate padding.

## Solution

Update the `TipScreen` component in `S710CheckoutSimulator.tsx`:

**File:** `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx` (lines 197–229)

1. **Change grid layout** — Replace `grid grid-cols-3 gap-2 mb-3` with `flex flex-col gap-2 mb-3` so buttons stack vertically and span full width.
2. **Adjust button styling** — Change from `py-3 flex flex-col items-center` to a horizontal layout: `py-3 px-4 flex flex-row items-center justify-between` so the percentage label is on the left and the calculated amount is on the right.
3. **Keep all existing selection logic, colors, and animations unchanged.**

The result will be three full-width rounded buttons stacked vertically, each showing the percentage on the left and the dollar amount on the right, matching the reference screenshot's vertical layout.

