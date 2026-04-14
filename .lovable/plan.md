

## Problem

The amber-styled activation checklist card uses `amber-500` with very low opacity (`/[0.04]`, `/15`, `/[0.06]`) for backgrounds and borders. On dark mode these subtle washes read well against near-black surfaces. On light mode, the light cream/white background swallows these low-opacity ambers, making the card border, progress bar track, icon box, and current-step highlight nearly invisible.

## Solution

Add light-mode-specific overrides using Tailwind's `dark:` prefix pattern so amber elements are more visible on light backgrounds without changing the dark mode appearance.

### Changes (single file: `ZuraPayActivationChecklist.tsx`)

| Element | Current | Light-mode fix |
|---|---|---|
| Card border | `border-amber-500/30` | `border-amber-400/50 dark:border-amber-500/30` |
| Card bg | `bg-amber-500/[0.04]` | `bg-amber-50 dark:bg-amber-500/[0.04]` |
| Icon box bg | `bg-amber-500/15` | `bg-amber-100 dark:bg-amber-500/15` |
| Progress track bg | `bg-amber-500/15` | `bg-amber-100 dark:bg-amber-500/15` |
| Progress bar fill | `bg-amber-500` | unchanged (already visible) |
| Current step highlight | `bg-amber-500/[0.06]` | `bg-amber-50 dark:bg-amber-500/[0.06]` |
| Check icons | `text-amber-500` | unchanged (already visible) |
| "Next" text | `text-amber-500` | unchanged |
| Action link | `text-amber-600 hover:text-amber-500` | unchanged |

This uses Tailwind's native light/dark split so dark mode stays exactly as-is while light mode gets proper amber tinting via Tailwind's semantic amber palette (`amber-50`, `amber-100`, `amber-400`).

