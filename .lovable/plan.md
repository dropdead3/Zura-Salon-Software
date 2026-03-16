

# Vertical Align Hero Card

## Problem
The right-column card has an explicit `lg:mt-4` offset (added in a previous iteration) that pushes it below center alignment. The grid uses `items-center` but the manual margin override breaks the vertical centering.

## Fix
Single change in `BackroomPaywall.tsx` line 450:
- Remove `lg:mt-4` from the right column wrapper (`<div className="flex flex-col relative lg:mt-4">`) so the grid's `items-center` properly vertically centers the card against the left text column.

## File
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — line 450

