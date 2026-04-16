

# Tint Schedule Column Headers with Theme-Aware Primary Color

## Problem
The stylist column headers currently use `bg-[hsl(var(--sidebar-background))]/95` — a neutral color regardless of theme. The user wants them tinted with the active color theme (e.g. dark purple for Zura, rose for Rose, etc.).

## Approach
Replace the neutral sidebar background with a layered approach: keep the dark sidebar base but overlay the theme's `--sidebar-primary` color at low opacity. This automatically adapts to every color theme.

## Changes — `src/components/dashboard/schedule/DayView.tsx`

### Line 648 (condensed layout)
```
Current:  bg-[hsl(var(--sidebar-background))]/95
New:      bg-[hsl(var(--sidebar-background))] bg-gradient-to-b from-[hsl(var(--sidebar-primary))]/10 to-[hsl(var(--sidebar-primary))]/5
```

### Line 667 (normal/medium layout)
Same change:
```
Current:  bg-[hsl(var(--sidebar-background))]/95
New:      bg-[hsl(var(--sidebar-background))] bg-gradient-to-b from-[hsl(var(--sidebar-primary))]/10 to-[hsl(var(--sidebar-primary))]/5
```

This uses `--sidebar-primary` which is already defined per-theme in the CSS (purple for Zura, rose for Rose, green for Sage, etc.), giving a subtle but distinct tinted header row that respects the active color theme.

Two class changes, one file.

