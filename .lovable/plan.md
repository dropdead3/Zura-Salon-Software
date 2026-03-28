

## Problem

The category rows show small progress bars that add visual noise without conveying information the percentage number doesn't already provide. The user wants a cleaner layout with just the percentage.

## Plan

**File: `src/components/dashboard/sales/RevenueByCategoryPanel.tsx`**

In the `CategoryRow` component (lines 141-148), remove the `Progress` bar and restructure the subtitle line to show `{sharePercent}% · {count} appointments` as a single text line — matching the pattern used in `StylistRow` (line 94).

### Before (lines 137-148):
```tsx
<div className="flex items-center gap-2">
  <span className="text-sm font-medium">{category.category}</span>
  <span className="text-xs text-muted-foreground">{category.sharePercent}%</span>
</div>
<div className="flex items-center gap-2 mt-0.5">
  <Progress ... />
  <span className="text-xs text-muted-foreground">{category.count} appointments</span>
</div>
```

### After:
```tsx
<span className="text-sm font-medium">{category.category}</span>
<p className="text-xs text-muted-foreground">
  {category.sharePercent}% · {category.count} appointment{category.count !== 1 ? 's' : ''}
</p>
```

Also remove the unused `Progress` import (line 5).

### Files modified
- `src/components/dashboard/sales/RevenueByCategoryPanel.tsx`

