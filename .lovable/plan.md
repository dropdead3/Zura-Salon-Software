

# Refine Setup Banner Light Mode Visibility

## Problem
The Z icon container uses `bg-amber-100` which blends into the card's `bg-amber-100/80` background in light mode — no contrast.

## Changes

**Edit: `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx`**

| Element | Current | Updated |
|---------|---------|---------|
| Icon container (line 110) | `bg-amber-100 dark:bg-amber-500/15` | `bg-amber-200 dark:bg-amber-500/15` |
| Card background (line 106) | `bg-amber-100/80 dark:bg-amber-500/[0.08]` | `bg-amber-50 dark:bg-amber-500/[0.08]` |

Shifting the card to `amber-50` and the icon to `amber-200` creates a clear two-step contrast so the icon container is distinct in light mode, while dark mode stays unchanged.

**1 file edited.**

