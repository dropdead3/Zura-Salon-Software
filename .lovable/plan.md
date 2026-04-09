

# Fix: Reduce Top-of-Page Spacing

## Problem

The content area sits too far below the top bar. Two sources of vertical gap stack:
1. `SuperAdminTopBar` outer wrapper: `pb-3` (12px bottom padding)
2. Main content wrapper in `DashboardLayout` line 577: `p-4 lg:p-8` (32px top padding on desktop)

Combined = 44px gap between the bottom of the top bar and the start of content. This creates the "sits too low" feeling.

## Fix

**`src/components/dashboard/DashboardLayout.tsx`** (line 577) — Change the content wrapper from uniform `p-4 lg:p-8` to directional padding that reduces the top:

```
p-4 lg:px-8 lg:pb-8 lg:pt-4
```

This keeps the 32px horizontal and bottom padding (matching the UI canon for page container spacing) but reduces the top padding to 16px on desktop. Combined with the top bar's 12px bottom padding, the visual gap becomes 28px — tight enough to feel connected without crowding.

## One file, one line change

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardLayout.tsx` | Line 577: `p-4 lg:p-8` → `p-4 lg:px-8 lg:pb-8 lg:pt-4` |

No other files affected. The top bar padding stays as-is — it needs its 12px for the rounded-full pill to breathe.

