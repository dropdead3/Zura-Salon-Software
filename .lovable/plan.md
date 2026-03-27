

## Problem

The `PremiumFloatingPanel` (used by the Customize Dashboard drawer, mobile sidebar, and other slide-in panels) is portaled directly to `document.body` with `fixed` positioning using `top-4`. Since the God Mode bar is also `fixed` at `top-0` with 44px height, these panels slide behind it.

The same issue affects:
- The Customize Dashboard drawer (right side)
- Mobile sidebar (left side)  
- Any other panel using `PremiumFloatingPanel`

## Solution

Update `PremiumFloatingPanel` to be God-Mode-aware by reading the impersonation state from `OrganizationContext` and offsetting the panel's top position by 44px when active.

### Changes

**File: `src/components/ui/premium-floating-panel.tsx`**

1. Import `useOrganizationContext` and read `isImpersonating`
2. In `getPositionClasses`, replace hardcoded `top-4` with a dynamic top value that accounts for the God Mode bar offset (44px + 16px gap = `top-[60px]` when impersonating, `top-4` otherwise)
3. Apply the same offset to the backdrop so it doesn't cover the God Mode bar
4. For mobile full-screen panels, use `top-[44px]` when impersonating instead of `top-0`

Since the context hook can't be called outside the component, the offset logic will be computed inside the component and passed as inline styles rather than modifying the utility function.

