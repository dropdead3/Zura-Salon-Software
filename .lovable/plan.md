

# Fix: Enable Scrolling in Supply Library Dialog

The scroll structure looks correct on paper: `DialogContent (max-h-[85vh], flex col)` → content wrapper (`flex-1 min-h-0 overflow-hidden`) → `BrandCardGrid (flex-1 min-h-0)` → `ScrollArea (flex-1 min-h-0)`.

The likely issue is that the `ScrollArea` component's `Viewport` doesn't have a bounded height. The Radix `ScrollAreaViewport` needs an explicit height constraint to activate scrolling. Since the flex chain should theoretically work, the problem is likely that the ScrollArea itself needs `h-0` combined with `flex-1` to force it to shrink and then grow within its flex parent, rather than just `min-h-0`.

**File: `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx`**

1. **Line 124** — Change the ScrollArea inside BrandCardGrid from `flex-1 min-h-0` to `flex-1 h-0` to force the scroll container to have a concrete bounded height:
   ```diff
   - <ScrollArea className="flex-1 min-h-0">
   + <ScrollArea className="flex-1 h-0">
   ```

2. **Line 89** — Similarly ensure the BrandCardGrid root uses `h-0` to create a concrete height boundary:
   ```diff
   - <div className="flex flex-col flex-1 min-h-0">
   + <div className="flex flex-col flex-1 h-0">
   ```

`h-0` with `flex-1` is the standard pattern to force a flex child to respect its parent's height and enable overflow/scrolling — `min-h-0` alone only removes the min-height default but doesn't establish a concrete height for the scroll area to measure against.

