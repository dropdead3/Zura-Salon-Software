

# Auto-Suggest Swatch Color from Product Name

## Approach

Create a keyword-matching utility that analyzes product names to guess the closest swatch color. Professional hair color names follow predictable patterns — shade levels map to darkness, and tone letters/words (NN, N, A, G, RR, V, etc.) map to specific color families.

## New utility: `src/lib/swatchSuggest.ts`

A pure function `suggestSwatchColor(productName: string): string | null` that:

1. **Checks for "Clear"** → returns `'transparent'`
2. **Extracts shade level** (reuses `extractShadeLevel`) to determine darkness bracket
3. **Parses tone indicators** from the product name using a keyword/letter map:
   - `NN`, `N` → Natural (brown family)
   - `A` → Ash (ash/cool family)
   - `G`, `GN` → Gold family
   - `RR`, `R`, `Red`, `Copper`, `Auburn` → Red/copper family
   - `V`, `VR`, `Violet`, `Mahogany` → Violet family
   - `B`, `Blue` → Blue family
   - `Blonde`, `Beige` → Blonde family
   - Keywords in the name like "Brown", "Blonde", "Ash", "Red", "Copper", "Gold", "Platinum"
4. **Combines level + tone** to pick the best match from `HAIR_COLOR_SWATCHES`:
   - Level 1-3 + neutral → Black/Dark Brown
   - Level 4-5 + neutral → Medium Brown/Light Brown
   - Level 6-7 + ash → Dark Ash/Ash
   - Level 6-7 + gold → Dark Gold/Gold
   - Level 8-9 + neutral → Dark Blonde/Blonde
   - Level 10+ → Light Blonde/Very Light Blonde/Platinum
   - Any level + red/copper indicator → Dark Red/Red/Dark Copper/Copper based on level
   - Any level + violet → Violet
   - Any level + blue → Blue

## Integration in `SupplyLibraryTab.tsx`

- When rendering the swatch picker, if `swatch_color` is `null`, compute `suggestSwatchColor(product.name)` and pass it as a new `suggestedValue` prop to `SwatchPicker`
- `SwatchPicker` shows the suggested swatch with a subtle dashed ring (distinct from a saved swatch) — clicking it confirms the suggestion and saves it
- Add a bulk action: "Auto-assign swatches" button in the color category header that iterates all null-swatch products, computes suggestions, and batch-saves them

## SwatchPicker update

Add optional `suggestedValue` prop. When `value` is null but `suggestedValue` exists, render the swatch circle with reduced opacity and a dashed border to indicate "suggested, click to confirm."

## Files

- **New:** `src/lib/swatchSuggest.ts` — keyword/level → swatch mapping logic
- **Modified:** `src/components/platform/backroom/SwatchPicker.tsx` — add `suggestedValue` display state
- **Modified:** `src/components/platform/backroom/SupplyLibraryTab.tsx` — wire suggestions + bulk auto-assign button

