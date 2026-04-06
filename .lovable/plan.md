

# Improve Inline KPI Input Visibility

## Problem

The editing inputs in the criteria matrix have poor contrast — dark background with dark text and small size makes values nearly unreadable during editing. The `$ 500`, `$ 750` etc. are barely visible against the dark card background.

## Solution

Improve the inline input cells with better contrast, slightly larger sizing, and clearer visual separation when in edit mode.

### Changes to `StylistLevelsEditor.tsx`

**Input styling (lines 539-556)**:
- Increase input width from `w-[72px]` to `w-[90px]` and height from `h-7` to `h-8`
- Add explicit light background: `bg-background text-foreground` so the value is always readable regardless of theme
- Bump text size from `text-xs` to `text-sm` for better legibility
- Increase the `$` and `%` prefix/suffix size from `text-[10px]` to `text-xs`
- Add a stronger border: `border-border/80` for clearer input boundaries

**Edit row highlight (lines 613-614)**:
- Strengthen the active row background from `bg-primary/5` to `bg-primary/8` for better visual grouping
- Make the ring slightly more visible: `ring-primary/30`

**Cell padding (line 522)**:
- Increase cell padding from `px-1.5 py-1.5` to `px-2 py-2` for breathing room

### No other files changed. No database changes.

