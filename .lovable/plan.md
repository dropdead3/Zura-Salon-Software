

# Fix DayView Tooltip to Appear Center-Screen

## Problem

The tooltip currently anchors to the appointment card and can overlap the sidebar or get clipped at edges, even with collision padding. The user wants it centered on screen for consistent, predictable placement.

## Approach

Replace the Radix `TooltipContent` positioning with a **fixed center-screen** placement using custom CSS classes on the existing `TooltipContent` component.

**File:** `src/components/dashboard/schedule/DayView.tsx` (line 482)

### What Changes

- Remove `side="right"` and `sideOffset`/`collisionPadding` props from `TooltipContent`
- Add custom className overrides to position the tooltip at center-screen using fixed positioning:
  - `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` for true center
  - Override Radix's default transform-based positioning with `!important` styles
- Since Radix `TooltipContent` renders inside a Portal, fixed positioning will work relative to the viewport

### Technical Detail

The `TooltipContent` already renders through a `TooltipPrimitive.Portal`. By applying `data-[side=bottom]:slide-in-from-top-2` and setting side to bottom (so Radix doesn't fight the positioning), then overriding with fixed-center classes, the tooltip will always appear in the center of the viewport regardless of which stylist column the card is in.

Alternatively, if Radix's positioning conflicts with fixed overrides, the cleaner approach is to swap from `Tooltip` to a custom hover-state div rendered via a React portal at a fixed center position -- but the CSS override approach will be tried first as it's minimal.

## Single file change, single line modification.

