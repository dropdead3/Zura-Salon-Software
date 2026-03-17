

# Re-analyze All Swatch Suggestions Against Updated Palette

## Problem
Several hex values in `swatchSuggest.ts` (in `TONE_LEVEL_MAP`, `guessColorFromName`, and `getMidLevelHex`) don't match the actual `HAIR_COLOR_SECTIONS` palette in `SwatchPicker.tsx`. The `inPalette` check then returns `null`, causing missing suggestions. Additionally, the existing "Apply All Suggestions" button only targets products without a swatch — there's no way to re-analyze products that already have one saved.

## Hex Mismatches to Fix

In `guessColorFromName`:
- `teal`: `#2A4A6B` should be `#2A6060` (palette Teal)
- `champagne`: `#D4A830` should be `#D9C48E` (palette Champagne)
- `mauve`: `#926092` should be `#7E4E7E` (palette Mauve)
- `orchid`: `#9E789E` should be `#926092` (palette Orchid)
- `smoke`: `#8A8A7B` should be `#C5C5BB` (palette Smoke)

In `getMidLevelHex`, `blue` uses `#2A4A6B` — fine (matches palette "Blue"), but the teal keyword routes to blue tone family and picks the wrong swatch.

## Changes

### File: `src/lib/swatchSuggest.ts`
1. Fix the 5 mismatched hex values in `guessColorFromName`
2. Cross-verify all `TONE_LEVEL_MAP` entries against the palette — no changes needed there (they all exist in palette)
3. Ensure `getMidLevelHex` values all exist in palette (they do)

### File: `src/components/platform/backroom/SupplyLibraryTab.tsx`
4. Update the bulk "Apply All Suggestions" button to also re-analyze products that already have a `swatch_color` — add a "Re-analyze All Swatches" action that overwrites existing values with fresh suggestions from the updated logic, with a confirmation dialog

