

# Improve Matrix Table Visual Separation and Divider Colors

## Problem
From the screenshot, the sticky left column and header row dividers blend into the dark theme background. The `border-border/60` partial opacity makes dividers nearly invisible. Section header rows lack clear visual distinction from data rows. The overall color palette needs better contrast between structural elements and content.

## Solution
Refine border colors, section header styling, and row alternation to create clearer visual hierarchy in both light and dark modes.

### Changes in `src/components/dashboard/settings/StylistLevelsEditor.tsx`

**1. Stronger sticky column divider**
- Replace `border-r-2 border-border/60` on all sticky left cells with `border-r border-border` (full opacity, 1px — cleaner and more visible)
- Remove redundant `border-l-2 border-l-primary` on section headers (the primary accent is already conveyed by the icon color)

**2. Header row bottom border**
- Change header `border-b-2 border-border` to `border-b border-border` for consistency
- Add `border-b border-border/40` to every `<TableRow>` in the body for subtle horizontal lines between data rows

**3. Section header rows — distinct background**
- Replace `bg-muted` on section header rows (Compensation, Promotion, Retention) with `bg-muted/80` plus a top border `border-t border-border` (full opacity) for clear section breaks
- The section header description cell ("At this level", "To reach this level") gets `text-muted-foreground/60` for subtlety

**4. Data cell column dividers**
- The table-level `[&_td]:border-r [&_td]:border-border/20` is too faint — increase to `border-border/30` for minimal but visible vertical gridlines
- Similarly `[&_th]:border-r [&_th]:border-border/20` → `border-border/30`

**5. Sticky shadow refinement**
- Soften the left-column shadow from `rgba(0,0,0,0.08)` to `rgba(0,0,0,0.06)` in light mode for less visual noise
- Darken the dark-mode variant from `rgba(0,0,0,0.3)` to `rgba(0,0,0,0.4)` for better edge definition

**6. Row hover state**
- Add `hover:bg-muted/20` to data rows for interactive feedback without clashing with section headers

### Summary of all class string updates (~15 locations)
- Sticky left cells: border opacity → full, shadow tuning
- Section header rows: background + top border refinement
- Table-level column divider opacity bump
- Data row hover and horizontal dividers

### Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx`

### No database changes.

