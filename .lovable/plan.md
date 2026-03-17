

# Fix: Brand Card Grid Not Scrolling

## Root Cause
The `BrandCardGrid` component renders `<div className="flex flex-col h-full">` but it's a flex child without `flex-1 min-h-0`, so `h-full` has no bounded height to resolve against. The `ScrollArea` inside grows to full content height instead of constraining and scrolling.

## Fix
**File: `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx`**

Two small changes:

1. **Line 89** — Change `BrandCardGrid`'s root div from `h-full` to `flex-1 min-h-0`:
   ```diff
   - <div className="flex flex-col h-full">
   + <div className="flex flex-col flex-1 min-h-0">
   ```

2. **Line 575** — Ensure the content wrapper passes overflow constraints. Add `overflow-hidden`:
   ```diff
   - <div className="flex-1 min-h-0 flex flex-col">
   + <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
   ```

This ensures the flex height chain flows properly: `DialogContent (max-h-85vh)` → content wrapper → `BrandCardGrid` → `ScrollArea`, allowing the scroll area to constrain and scroll.

