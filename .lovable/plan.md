

## Problem

The backdrop overlay uses `fixed inset-0 z-40`, which covers the entire viewport including the top navigation bar. Since the "View As" popover lives inside the top bar, the blur/darken effect incorrectly obscures the nav bar instead of just the page content below it.

## Plan

**File:** `src/components/dashboard/ViewAsPopover.tsx`

1. Change the backdrop overlay to start below the top bar instead of covering the full viewport. Replace `inset-0` with `top-[60px] left-0 right-0 bottom-0` (matching the approximate top bar height) and increase z-index reasoning:

```tsx
// Before
<div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm ..." />

// After  
<div className="fixed top-[60px] left-0 right-0 bottom-0 z-40 bg-black/40 backdrop-blur-sm ..." />
```

This keeps the top navigation bar fully visible and unblurred while darkening and blurring only the page content area below it. The `top-[60px]` value aligns with the top bar's height (pt-3 + pb-3 + inner content ≈ 60px).

