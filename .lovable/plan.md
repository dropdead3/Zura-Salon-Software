

## Problem

The Zura Insights expansion panel has visible shadow/corner artifacts caused by two issues:

1. **Shadow clipping**: The `AIInsightsPanel` uses `shadow-lg` on its container (line 716), but the parent `motion.div` in `CommandCenterControlRow.tsx` (line 166) uses `overflow-hidden` for the height animation. This clips the box-shadow, creating visible artifacts at the rounded corners.

2. **Backdrop blur ghosting**: A `backdrop-blur-sm` on the summary strip inside the panel (line 790) can cause per-frame re-sampling artifacts during animation.

## Plan

**File: `src/components/dashboard/CommandCenterControlRow.tsx`**

Change `overflow-hidden` to `overflow-clip` on both expansion `motion.div` containers (lines 166, 183). `overflow-clip` prevents content overflow without creating a new stacking context that clips box-shadows, and it avoids the compositing issues that `overflow-hidden` can cause with backdrop-blur children.

**File: `src/components/dashboard/AIInsightsDrawer.tsx`**

1. Line 716: Remove `shadow-lg` from the panel container — the border is sufficient, and removing the shadow eliminates the clipping source entirely. The panel sits in document flow (not floating), so a heavy shadow is unnecessary.

2. Line 790: Remove `backdrop-blur-sm` from the summary strip — replace with a solid `bg-muted/40` to eliminate the per-frame blur compositing artifacts.

