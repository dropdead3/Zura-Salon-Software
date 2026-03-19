
# Fix Amber Ghost Styling for Light Mode

## Problem
The setup banner uses amber colors with low-opacity backgrounds (`bg-amber-500/[0.08]`, `bg-amber-500/10`, `text-amber-400`) designed for dark mode. On light mode these are nearly invisible or washed out.

## Changes

**Edit: `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx`**

Update these amber color classes to use dark-mode-aware variants:

| Element | Current | Updated |
|---------|---------|---------|
| Card bg/border (line 106) | `border-amber-500/50 bg-amber-500/[0.08]` | `border-amber-500/30 dark:border-amber-500/50 bg-amber-100/80 dark:bg-amber-500/[0.08]` |
| Z icon container (line 110) | `bg-amber-500/15` | `bg-amber-100 dark:bg-amber-500/15` |
| Counter text (line 118) | `text-amber-400/80` | `text-amber-600 dark:text-amber-400/80` |
| Resume Setup button (line 123) | `bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/50 hover:border-amber-500/70` | `bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 dark:border-amber-500/50 hover:border-amber-500/60` |
| Incomplete step circles (line 143) | `border-amber-500/40` | `border-amber-400 dark:border-amber-500/40` |
| Step connector done (line 152) | `bg-amber-500/60` | `bg-amber-400 dark:bg-amber-500/60` |

This gives warm, visible amber tones on light backgrounds while preserving the existing dark-mode ghost aesthetic.

**1 file edited.**
