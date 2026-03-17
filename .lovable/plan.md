

# Expand Swatch Palette to ~120 Tones with Pastels & Vivids

## Current State
- 20 swatches in a flat 5-column grid
- No pastels, no vivids, no section labels
- `swatchSuggest.ts` maps tone+level to specific hex values from this palette

## Changes

### 1. Expand `HAIR_COLOR_SWATCHES` in `SwatchPicker.tsx`

Organize into labeled sections (~120 total swatches):

- **Natural** (~15): Black → Dark Brown → Medium Brown → Light Brown → Dark Blonde → Medium Blonde → Blonde → Light Blonde → Very Light Blonde → Platinum → White Blonde
- **Ash / Cool** (~10): Dark Ash Brown → Ash Brown → Light Ash → Silver Ash → Pewter → Smoke → Cool Beige → Icy Blonde
- **Gold / Warm** (~10): Dark Gold → Gold Brown → Warm Gold → Golden Blonde → Honey → Champagne → Butter Blonde → Light Gold
- **Red** (~10): Darkest Red → Burgundy → Dark Red → Red → Bright Red → Strawberry → Red-Brown → Mahogany → Cherry → Rose Red
- **Copper / Auburn** (~10): Dark Auburn → Auburn → Dark Copper → Copper → Bright Copper → Copper Blonde → Ginger → Titian → Russet
- **Violet / Mauve** (~8): Dark Plum → Plum → Deep Violet → Violet → Mauve → Lavender → Light Violet → Rose Mauve
- **Blue / Teal** (~8): Dark Navy → Navy → Steel Blue → Blue → Teal → Denim → Slate → Light Blue
- **Pastel** (~12): Pastel Pink → Pastel Rose → Pastel Peach → Pastel Coral → Pastel Lavender → Pastel Lilac → Pastel Blue → Pastel Mint → Pastel Green → Pastel Yellow → Pastel Apricot → Pastel Silver
- **Vivid / Fashion** (~12): Hot Pink → Magenta → Fuchsia → Electric Purple → Neon Violet → Electric Blue → Cyan → Neon Green → Vivid Orange → Fire Red → Vivid Yellow → Vivid Coral
- **Clear** (1): Transparent (always last)

### 2. Update SwatchPicker UI

- Add section headers (tiny labels like "Natural", "Ash", "Pastel", "Vivid") above each group
- Increase grid to 8 columns to keep the popover compact despite more swatches
- Add a scrollable container (max-height ~350px) so the popover doesn't overflow
- Keep the current swatch size (w-7 h-7) and interaction patterns

### 3. Update `swatchSuggest.ts` TONE_LEVEL_MAP

- Add `pastel` and `vivid` tone families
- Map pastel/vivid keywords ("pastel", "neon", "vivid", "fashion", "bright", "electric") to new tone families
- Update hex references to point to new palette entries
- Expand violet and blue families to have level-based variants instead of single defaults

### Files
- **Modified:** `src/components/platform/backroom/SwatchPicker.tsx` — expand palette array, add section headers, scrollable grid
- **Modified:** `src/lib/swatchSuggest.ts` — add pastel/vivid tone families, update hex mappings, expand violet/blue level maps

