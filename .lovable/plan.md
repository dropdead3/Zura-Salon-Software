

# Enhance Level Roadmap PDF to Match Digital Preview

## Problem
The current PDF uses a dark header bar, cramped spacing, and basic helvetica styling that diverges from the digital roadmap's clean, centered, airy aesthetic. The user wants the PDF to closely resemble the screenshot — centered org header, refined timeline, spacious cards with proper section hierarchy.

## Changes (single file: `LevelRequirementsPDF.ts`)

### 1. Header — Match digital's centered layout
- Remove the dark background bar
- Center: org name (large, uppercase, tracked), "Level Graduation Roadmap" subtitle (small, tracked), "Generated: date" below
- "X Levels" badge aligned right on the same line as the subtitle

### 2. Timeline — Refine to match digital
- Larger node circles with proper ring effect (double-circle for "configured" nodes)
- Thicker connector lines with chevron-like gaps between nodes
- Better label spacing and truncation

### 3. Summary Stats — More generous padding
- Taller stat boxes with more internal whitespace
- Larger value text, matching the digital's `text-2xl` proportions

### 4. Level Detail Cards — Closer to digital cards
- Thicker accent bar (2mm instead of 2mm but with rounded top corners)
- More internal padding (match the p-5 feel)
- Section headers: "COMPENSATION", "GRADUATION REQUIREMENTS", "RETENTION POLICY" with wider tracking (matching `tracking-widest`)
- KPI grid cells: taller with more breathing room, label above value
- Compensation displayed as `Service: 45%  ·  Retail: 20%` with the label/value pattern from the digital view
- Evaluation details with bullet-dot separators
- Retention policy with colored action type text

### 5. Footer — Lighter, centered
- Centered confidential text matching the digital footer style
- Page numbering maintained

### 6. Typography improvements
- Use consistent font sizing hierarchy: 14pt card titles, 7pt section headers, 9pt values
- Increase line spacing throughout
- More generous margins between sections

## Files

| File | Action |
|------|--------|
| `src/components/dashboard/settings/LevelRequirementsPDF.ts` | Rewrite styling to match digital roadmap aesthetic |

No new files, no database changes.

