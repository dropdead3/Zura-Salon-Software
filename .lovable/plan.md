

# Receipt Preview — Fit to Receipt Size + Sticky on Scroll

## Problem
The live preview card stretches to fill the grid column height instead of matching actual receipt proportions. When scrolling through the long settings panel, the preview scrolls out of view.

## Changes

### `src/components/dashboard/settings/terminal/ZuraPayReceiptsTab.tsx`

1. **Make the preview column sticky**: Wrap the preview `Card` (lines 414-439) in a `div` with `className="lg:sticky lg:top-6 self-start"` so it stays visible while scrolling the settings panel on desktop.

2. **Constrain the preview card width to receipt size**: Add `max-w-[360px]` to the preview Card and remove the implicit full-width stretch. The receipt preview already has `max-w-[320px] mx-auto` internally — the card just needs to stop stretching vertically.

3. **Add `self-start` to the preview card** so it doesn't stretch to match the settings panel height in the grid layout.

4. **Adjust the parent grid**: Change `grid-cols-1 lg:grid-cols-2` to use `items-start` so columns align to top instead of stretching equally.

### Summary of CSS changes (no logic changes):
- Line 233: Add `items-start` to the grid container
- Lines 413-414: Wrap preview Card in a sticky container div

