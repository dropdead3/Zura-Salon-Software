

## Problem

The popover's inner content uses a glass aesthetic (`bg-card/80 backdrop-blur-xl backdrop-saturate-150`) which differs from the menu bar and main cards that use the standard `tokens.shine.inner` — solid `bg-background` with no blur/transparency.

## Plan

**File:** `src/components/dashboard/ViewAsPopover.tsx` (line 134)

Replace the glass inner wrapper classes with the standard token classes:

```
// Before
"silver-shine-inner block bg-card/80 backdrop-blur-xl backdrop-saturate-150 rounded-[calc(theme(borderRadius.xl)-1px)] overflow-hidden flex flex-col"

// After
"silver-shine-inner block bg-background rounded-[calc(theme(borderRadius.xl)-1px)] overflow-hidden flex flex-col"
```

This matches `tokens.shine.inner` (`bg-background`) — the same solid background treatment used by the nav bar and dashboard cards — while keeping the animated silver-shine stroke on the outer border.

