

# Enhance Sticky Row/Column Visual Separation

## Problem
From the screenshot, the sticky header row and sticky left column lack clear divider lines against the data area. The boundary between frozen elements and scrollable content is not distinct enough, making it hard to visually parse the matrix.

## Solution
Add stronger border lines on the edges where sticky elements meet the data area, and refine the existing borders for better separation.

### Changes in `StylistLevelsEditor.tsx`

1. **Header row bottom border**: Strengthen from `border-b-2 border-border/60` to `border-b-2 border-border` (full opacity) on the header `TableRow` (~line 758).

2. **Left column right border on header cell**: Strengthen from `border-r border-border/40` to `border-r-2 border-border/60` on the sticky "Metric" `TableHead` (~line 759) — a thicker, more visible right edge.

3. **Left column right border on all body sticky cells**: Change `border-r border-border/40` to `border-r-2 border-border/60` on:
   - Section header sticky cells (Compensation ~806, Promotion ~851, Retention ~865)
   - Commission/Wage label cells (~818, ~837)
   - `renderMetricRow` sticky cell (~701)

4. **Level column headers**: Add `border-b-2 border-border` to match the header row's bottom edge (already inherited from `TableRow`, but ensure consistency).

5. **Section header rows**: Add `border-t-2 border-border/60` to the section header `TableRow` elements (Compensation ~805, Promotion ~850, Retention ~864) to create clear visual breaks between sections.

6. **Data cells bottom border**: The default `TableRow` border is fine (`border-b border-border/50`), no change needed.

7. **Add subtle shadow to sticky left column**: On all sticky `left-0` cells, add a box-shadow to create a drop-shadow effect when content scrolls underneath:
   - Add `shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]` (or `dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]`) to all sticky left cells.
   - This provides a depth cue showing the frozen column is "above" the scrolling content.

8. **Add subtle shadow to sticky header**: On the `TableHeader` element, add `shadow-[0_2px_4px_-2px_rgba(0,0,0,0.08)]` for the same depth effect on the frozen header row.

### Summary of visual improvements
- Thicker right border (2px) on left column edge
- Full-opacity bottom border on header row
- Top borders on section headers for clear grouping
- Subtle drop shadows on both sticky axes for depth separation

### Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — ~12 class string updates for borders and shadows

### No database changes.

