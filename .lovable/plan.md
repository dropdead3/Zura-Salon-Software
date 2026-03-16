

# Add IntersectionObserver to AnimatedNumber

**File:** `src/components/ui/AnimatedNumber.tsx`

## Problem
The counter animates immediately on mount, even if offscreen. It should wait until the element scrolls into view, then animate once.

## Changes

1. Add a `ref` to the `<span>` element
2. Replace the mount-based animation trigger with an `IntersectionObserver` that:
   - Watches the span element
   - On first intersection (`threshold: 0.1`), triggers `animateValue(0, value)` and sets `hasAnimated = true`
   - Disconnects after first trigger (animate once only)
3. Keep the existing value-change animation (lines 43-53) so if the data updates after the initial animation, it still transitions smoothly
4. Display `0` (formatted) until the element enters view

No new dependencies needed — just the native `IntersectionObserver` API, same pattern used in `use-counter-animation.ts`.

