

# Fix Fullscreen View with God Mode Banner

## Problem
The fullscreen criteria matrix uses `fixed inset-0 z-50`, but the God Mode bar is `z-[60]` and `fixed top-0`. This means the fullscreen overlay sits behind the God Mode bar, and its top content is hidden underneath it.

## Solution
Two changes in `StylistLevelsEditor.tsx`:

1. **Import `useOrganizationContext`** to detect if God Mode (impersonation) is active.
2. **Adjust the fullscreen container** (~line 159):
   - Increase z-index to `z-[70]` (above God Mode's `z-[60]`)
   - When impersonating, add `top-[44px]` (desktop) / `top-[40px]` (mobile) so the fullscreen view sits below the God Mode bar instead of overlapping it
   - Use the existing `useIsMobile` hook (already likely available or import it) to pick the correct offset

### Code change (line ~159)
```tsx
// Before
<div className="fixed inset-0 z-50 bg-background flex flex-col">

// After — conditionally offset for God Mode bar
<div className={cn(
  "fixed inset-x-0 bottom-0 z-[70] bg-background flex flex-col",
  isImpersonating ? (isMobile ? 'top-[40px]' : 'top-[44px]') : 'top-0'
)}>
```

This keeps the God Mode bar visible and functional while the fullscreen editor fills the remaining viewport.

### Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — add `useOrganizationContext` import, add `useIsMobile` import (if not already present), update fullscreen container classes

### No database changes.

