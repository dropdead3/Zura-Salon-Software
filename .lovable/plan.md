

# Add Sub-Line Grouping for Large Category Sections

## Problem
When drilling into a brand like L'Oréal (263 products), the "Color" category section shows 252 items in a single flat list. This is overwhelming. Products naturally cluster into **product lines** (e.g., Majirel, INOA, Dia Light) that should be visually grouped.

## Approach
Add a **nested sub-grouping** within category collapsible sections when the product count exceeds a threshold (e.g., 20+). Products are grouped by extracting the product line prefix from the name.

### Product Line Extraction Logic
Parse the first word(s) of the product name before the shade number:
- `"Majirel 7.0 Blonde"` → **Majirel**
- `"INOA 6.1 Dark Ash Blonde"` → **INOA**
- `"Dia Light 8.31"` → **Dia Light**
- `"Vero K-PAK 5N"` → **Vero K-PAK**
- `"Ionic Color 7A"` → **Ionic Color**

A helper function matches product name against known multi-word prefixes, falling back to first-word extraction.

### UI Changes in `SupplyLibraryTab.tsx`

Within each category collapsible (lines ~682-730), when a category group has 20+ products:

1. **Sub-group products by product line** using the extraction logic
2. **Render nested collapsible headers** for each sub-line:
   ```
   ▼ Color (252)
     ▼ Majirel (109)
       [product rows...]
     ▼ INOA (61)
       [product rows...]
     ► Dia Light (47)
     ► Dia Richesse (35)
   ```
3. Sub-line headers use a lighter styling (indented, smaller badge) to visually nest under the category header
4. Categories with fewer than 20 products render flat as they do today — no change

### Files Modified
- `src/components/platform/backroom/SupplyLibraryTab.tsx` — Add sub-line grouping logic and nested collapsibles in the brand detail view
- `src/lib/supply-line-parser.ts` (new) — Helper to extract product line prefix from product name, with known multi-word prefix list

### No Database Changes Required
This is purely a UI presentation change — product line is derived from the existing `name` field at render time.

