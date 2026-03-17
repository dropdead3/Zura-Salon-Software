

# Apply Redken Shade Chart Insights to Swatch Suggestion Engine

## Analysis

The Redken Shades EQ chart reveals **~20 tone codes missing** from `TONE_CODE_MAP` and several keyword gaps. The chart uses a Level (1-10) × Tone Family grid — our engine matches this architecture but has blind spots.

### Missing Tone Codes (from chart columns)

| Code | Chart Label | Target Family |
|------|-------------|---------------|
| `T` | Titanium | `ash` |
| `SB` | Silver Blue | `ash` |
| `GY` | Green Yellow (Matte) | `ash` |
| `P` | Pearl | `ash` |
| `PP` | Pearl Pearl | `ash` |
| `M` | Matte | `ash` |
| `W` | Warm | `gold` |
| `WG` | Warm Gold | `gold` |
| `WN` | Warm Natural | `gold` |
| `NW` | Natural Warm | `gold` |
| `NG` | Natural Gold | `gold` |
| `NB` | Natural Blue/Mahogany | `natural` |
| `Y` | Yellow | `gold` |
| `O` | Orange | `copper` |
| `RO` | Red Orange | `copper` |
| `OR` | Orange Red | `copper` |
| `VG` | Violet Gold | `violet` |
| `VRo` | Violet Rose | `red_violet` |
| `RVG` | Red Violet Gold | `red_violet` |
| `BP` | Blue Pearl | `ash` |

### Keyword Gaps

- `\bpearl\b` → `ash` (pearlescent = cool iridescent)
- `\bmatte\b` → `ash` (green-based neutralizer = cool)
- `\btitanium\b` → `ash`
- `\bdriftwood\b` → `ash` (Redken 07M Driftwood)
- `\bchicory\b`, `\bmaple\b`, `\bmocha java\b` → `warm_brown`
- `\bcardamom\b`, `\bcedar\b`, `\bsandal\b` → `warm_brown`
- `\brose\b` (standalone, not "rose gold") → `red_violet`
- `\bflamme\b`, `\bpaprika\b` → `copper`
- `\bbonfire\b` → `red`
- `\bcayenne\b` → `red`

### `inPalette` Issue

Currently, computed hex values that don't exactly match a palette swatch return `null` (no suggestion). Since the palette is curated but the TONE_LEVEL_MAP uses computed hex values, we should ensure all TONE_LEVEL_MAP hex values exist in the palette. Any new hex values added to TONE_LEVEL_MAP must have corresponding entries in `HAIR_COLOR_SECTIONS`.

## Changes

### File: `src/lib/swatchSuggest.ts`

1. **Add ~20 missing tone codes** to `TONE_CODE_MAP` (the table above)
2. **Add ~12 missing keywords** to `KEYWORD_TONE_MAP` (pearl, matte, titanium, driftwood, chicory, maple, cedar, rose, paprika, cayenne, bonfire, flamme)
3. **Add missing direct color entries** to `guessColorFromName` for the Redken-specific color names (Driftwood, Mother of Pearl, Chicory, Storm Cloud, etc.)

### File: `src/components/platform/backroom/SwatchPicker.tsx`

No changes needed — existing palette hex values already cover the tone families. The TONE_LEVEL_MAP hex values already reference palette entries.

### Summary

Single-file edit to `swatchSuggest.ts`: ~35 new map entries across three lookup tables. No new tone families needed — the existing 11 families cover all Redken chart columns.

