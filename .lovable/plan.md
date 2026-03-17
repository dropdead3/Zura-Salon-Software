

# Re-analyze All Swatch Suggestions for Non-Numeric Products

## Problem
Products like "Super Power Dusty Lavender", "Super Power Orange", "Super Power Rose Gold", etc. get no swatch suggestion because `suggestSwatchColor` returns `null` when no numeric shade level is found (`level === 999`). The function only bypasses level-based lookup for `pastel` and `vivid` tone families, but many fashion color products don't contain keywords like "vivid" or "pastel" — they just have color names like "Dusty Pink", "Teal", "Purple".

## Root Cause
In `src/lib/swatchSuggest.ts`, line 296: `if (level === 999) return null;` — this kills suggestions for any product without a shade number, even if the name clearly indicates a color.

## Changes

### File: `src/lib/swatchSuggest.ts`

1. **Remove the early `return null` for `level === 999`** — instead, when no shade level is found, fall through to a keyword-based color lookup.

2. **Add a `guessColorFromName` function** that maps common color words directly to palette hex values. This handles products like:
   - "Dusty Lavender" → Pastel Lavender hex
   - "Dusty Pink" → Pastel Pink / Pastel Rose hex
   - "Orange" → Vivid Orange hex
   - "Purple" → Electric Purple hex
   - "Rose Gold" → a copper/pink blend hex
   - "Silver Smoke" → Smoke (ash) hex
   - "Teal" → Teal hex
   - "Vibrant Red" → Fire Red hex
   - "Yellow" → Vivid Yellow hex
   - "Hot Pink" → Hot Pink hex
   - "Magenta" → Magenta hex
   - "Electric Blue" → Electric Blue hex

3. **Expand keyword matching** to include "dusty" → pastel family, "vibrant" → vivid family, and common standalone color words (orange, purple, yellow, teal, pink, etc.) that currently fall through to 'natural' tone.

4. **Update `KEYWORD_TONE_MAP`** with additional entries:
   - `/\bdusty\b/i` → 'pastel'
   - `/\bvibrant\b/i` → 'vivid'
   - `/\borange\b/i` → 'vivid'
   - `/\byellow\b/i` → 'vivid'
   - `/\bpink\b/i` → 'vivid'
   - `/\brose\s*gold\b/i` → 'copper' (special case)
   - `/\bsilver\s*smoke\b/i` → 'ash' (already partially covered)

5. **Update flow in `suggestSwatchColor`**: When `level === 999` and tone is detected (not just default 'natural'), use `refinePastelVividHex` for pastel/vivid or pick a mid-level swatch for other tone families. Only return `null` if tone is still 'natural' with no keywords matched.

