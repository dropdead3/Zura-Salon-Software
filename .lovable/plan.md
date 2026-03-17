

# Expand Swatch Palette + Add RGB Color Picker

## Problem
The current swatch palette lacks mixed-tone colors (red-violets, warm purples, cool tans, etc.) and there's no way to pick an arbitrary color when the palette doesn't have an exact match.

## Changes

### 1. Expand `HAIR_COLOR_SECTIONS` in `SwatchPicker.tsx`

Add new sections and expand existing ones with mixed-tone swatches:

- **New section: "Red Violet"** — Dark Red Violet, Red Violet, Bright Red Violet, Rose Violet, Light Red Violet (~6 swatches)
- **New section: "Warm Brown / Mocha"** — Dark Mocha, Mocha, Warm Tan, Cool Tan, Sand, Mushroom Brown (~6-8 swatches)
- **Expand "Violet / Mauve"** — add Aubergine, Warm Plum, Purple-Brown, Iridescent Violet
- **Expand "Red"** — add Red-Mahogany, Cranberry, Merlot, Raspberry
- **Expand "Ash / Cool"** — add Cool Sand, Cool Tan, Greige, Mushroom, Steel Beige
- **Expand "Copper / Auburn"** — add Copper-Red, Copper-Violet, Burnt Sienna
- **Expand "Gold / Warm"** — add Caramel Gold, Toffee, Butterscotch

### 2. Add RGB/hex color picker to `SwatchPicker.tsx`

Below the swatch grid sections (inside the ScrollArea), add a "Custom Color" section with:
- A native HTML `<input type="color">` styled to match the platform dark theme
- A hex text input for direct entry (e.g. `#8B2A4E`)
- An "Apply" button that calls `onChange` with the custom hex
- This lets users pick any color not in the curated palette

### 3. Update `swatchSuggest.ts`

- Add new hex values from the expanded palette to `TONE_LEVEL_MAP` and `guessColorFromName` for the new mixed tones (red-violet keywords, cool tan keywords, etc.)
- The `inPalette` check in `suggestSwatchColor` will now also need to accept custom hex values — since custom picks won't be in the palette array, the suggestion engine stays palette-only but manual picks are unrestricted

### 4. Allow non-palette hex values in `SwatchPicker`

Currently `onChange` already accepts any hex string. The trigger button already renders any `value` hex via inline `backgroundColor`. No changes needed for display — just need to ensure the custom picker calls `onChange` with the chosen hex.

