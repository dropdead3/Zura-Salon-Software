

# Fix Level Roadmap PDF — Typography, Spacing & Alignment

## Issues Identified

From the actual PDF output, there are five distinct rendering problems:

1. **Level titles truncated** — "LEVEL 1 — NEW TALE'" / "STUDIO ARTI" / "CORE ARTI" / "ICON ARTI" — the `charSpace: 0.5` on the title makes text physically wider than `getTextWidth()` reports, so the status badge placement clips the title. The title itself also overflows the card width.

2. **Compensation labels overlap values** — "SERVI**C**46%" and "RETA**I**20%" — the `charSpace: 0.8` on the 6pt label causes width miscalculation, so the bold value text is placed too close and overlaps.

3. **Excessive letter-spacing on section headers** — "C O M P E N S A T I O N" and "G R A D U A T I O N  R E Q U I R E M E N T S" use `charSpace: 1.5` which looks scattered and amateurish at small sizes.

4. **No visual separation between label and value in compensation** — the label text runs directly into the value with no clear gap because `charSpace` inflates the measured width incorrectly.

5. **Card title font size too large** — at 13pt with charSpace, longer level names like "SIGNATURE ARTIST" overflow the available width.

## Root Cause

jsPDF's `getTextWidth()` does **not** account for `charSpace`. When `charSpace: 0.5` is applied to a 13pt title, the rendered text is significantly wider than the measured width, causing:
- The status badge to be placed on top of the title
- Titles to overflow the card boundary

Similarly, compensation labels with `charSpace: 0.8` at 6pt make the label appear much wider than calculated, causing the value to overlap.

## Fix Plan

**File:** `src/components/dashboard/settings/LevelRequirementsPDF.ts`

### 1. Add a `textWidthWithCharSpace` helper
Calculate actual rendered width: `getTextWidth(text) + charSpace * (text.length - 1)`. Use this everywhere `charSpace` is combined with position calculations.

### 2. Fix title rendering (lines 322-349)
- Reduce font size from 13 to 11
- Reduce `charSpace` from 0.5 to 0.3
- Use the corrected width helper for status badge X position
- Add a `maxWidth` constraint so long names truncate with ellipsis rather than overflowing

### 3. Fix compensation label/value overlap (lines 390-416)
- Remove `charSpace` from the 6pt labels entirely (too small for letter-spacing)
- Instead, render label and value as: `"SERVICE 45%"` with label in grey and value in dark, using proper width calculations with a fixed gap between label and value
- Add a minimum gap of 3mm between label text and value text

### 4. Reduce section header charSpace (lines 378-380, 429-431, 500-503)
- Reduce `charSpace` from 1.5 to 0.8 on "COMPENSATION", "GRADUATION REQUIREMENTS", "RETENTION MINIMUMS", "RETENTION POLICY" headers
- This keeps the spaced-caps aesthetic without looking scattered

### 5. Tighten timeline label truncation (line 207-208)
- Increase `maxChars` from 12 to 14 for non-compact mode so "Studio Artist" and "Senior Artist" don't get ellipsized

## Scope

- Single file: `LevelRequirementsPDF.ts`
- No database changes
- No UI component changes — PDF generation only

