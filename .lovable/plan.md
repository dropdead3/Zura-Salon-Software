

# Increase FAB Chat Modal Height with Mobile Responsiveness

## Current State
The modal is fixed at `w-[400px] h-[520px]` with no responsive sizing. On smaller screens this could overflow or feel cramped.

## Changes

### File: `src/components/dashboard/HelpFAB.tsx`
- Change the PopoverContent sizing from fixed `h-[520px]` to a responsive approach:
  - Desktop: `h-[620px]` (increase by 100px for more conversation space)
  - Mobile: Use `max-h-[calc(100vh-120px)]` to prevent overflow on small screens
  - Width: Add `max-sm:w-[calc(100vw-32px)]` so on mobile it fills width with 16px margins
  - Final classes: `w-[400px] h-[620px] max-h-[calc(100vh-120px)] max-[430px]:w-[calc(100vw-32px)]`

### File: `src/components/dashboard/help-fab/AIHelpTab.tsx`
- Update the empty state container height from `h-[340px]` to `h-[420px]` to fill the taller modal
- This gives more breathing room between the icon, description, and prompt list

### File: `src/components/dashboard/HelpFAB.tsx` (FAB position)
- Adjust the fixed FAB position for mobile: add `max-sm:bottom-4 max-sm:right-4` to tighten on small screens (currently `bottom-6 right-6`)

## Technical Details
- Uses Tailwind responsive modifiers and `max-h` with viewport units for safe mobile sizing
- No new dependencies
- ~5 lines changed across 2 files

