

# Remove Glow, Add Arrow-Reveal-on-Hover

**File:** `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (lines 335–362)

## Current State
The `ActivateButton` has `shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30` creating a glow effect. The `ArrowRight` icon is always visible.

## Changes

1. **Remove glow classes** — strip `shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30` from the Button className.

2. **Animate arrow on hover** — wrap `ArrowRight` so it's hidden by default and slides in from the left on button hover using Tailwind's `group` pattern:
   - Add `group` to the Button className
   - Wrap `ArrowRight` in a span with `overflow-hidden w-0 group-hover:w-5 transition-all duration-200` so the arrow width expands on hover, creating a smooth reveal effect
   - Add `translate-x-[-4px] group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-200` to the arrow icon itself

