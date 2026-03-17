

# Spin the Re-analyze Icon During Analysis

## Problem
The RefreshCw icon on the "Re-analyze all" button is static. It should spin while the bulk update is running (after the user confirms in the AlertDialog).

## Changes

**File: `src/components/platform/backroom/SupplyLibraryTab.tsx`**

1. Add a `reanalyzingCategory` state (`string | null`) to track which category is currently being re-analyzed.
2. In the AlertDialog's `onClick` handler (~line 934), set `reanalyzingCategory` to the category name before the loop, and clear it after completion (alongside `setReanalyzeConfirm(null)`).
3. On the RefreshCw icon (~line 1030), add `animate-spin` when `reanalyzingCategory` matches the current category:
   ```tsx
   <RefreshCw className={cn('w-3 h-3 mr-0.5', reanalyzingCategory === (SUPPLY_CATEGORY_LABELS[category] || category) && 'animate-spin')} />
   ```
4. Disable the button while that category is re-analyzing to prevent double-clicks.

