

## Fix: Top Bar Respects God Mode Bar Offset

### Problem
The `SuperAdminTopBar` uses `sticky top-0` (or `fixed top-0` in hideFooter mode), so it sits at the very top of the viewport — behind the God Mode bar which is `fixed top-0 z-[60]`.

### Fix (single file: `SuperAdminTopBar.tsx`)

Pass `isImpersonating` context into the top bar and offset its top position by the God Mode bar height (44px) when active:

1. **Import** `useOrganizationContext` and read `isImpersonating`
2. **Sticky mode** (~line 146): Change `"sticky top-0"` → `isImpersonating ? "sticky top-[44px]" : "sticky top-0"`
3. **Fixed mode** (~line 145): Change `"fixed top-0"` → `isImpersonating ? "fixed top-[44px]" : "fixed top-0"`

This ensures the top bar always clears the God Mode bar when it's visible, in both sticky and fixed positioning modes.

