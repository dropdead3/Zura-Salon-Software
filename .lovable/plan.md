

## Make Scheduler Appointments Visibly Reflect Category Color Themes

### Problem
The dark-mode appointment cards use very low-opacity fills (`rgba` at 0.18 alpha), making all cards appear similarly dark regardless of their service category color. The configured category color palette themes are barely visible.

### Root Cause
In `src/utils/categoryColors.ts`, the `getDarkCategoryStyle()` function produces translucent fills that are too subtle against the dark calendar background. The left accent bar uses the category color, but the card fill is nearly invisible.

### Fix
**1 file**: `src/utils/categoryColors.ts` — `getDarkCategoryStyle()` function (lines 334-371)

Increase the fill opacity from 0.18 → 0.28 (colored) and 0.22 → 0.30 (grays) so the category tint is clearly visible on cards. Also bump hover/selected states proportionally.

```
// Current
fillAlpha = isGray ? 0.22 : 0.18;
hover = rgba(r, g, b, isGray ? 0.30 : 0.28);
selected = rgba(r, g, b, isGray ? 0.36 : 0.32);

// Proposed
fillAlpha = isGray ? 0.30 : 0.28;
hover = rgba(r, g, b, isGray ? 0.38 : 0.36);
selected = rgba(r, g, b, isGray ? 0.44 : 0.40);
```

This makes each category's color visibly distinct while maintaining the dark-mode aesthetic — cards will show clear tinting that matches the org's configured category color palette.

### Scope
- **1 file modified**: `src/utils/categoryColors.ts`
- **3 values changed**: fill, hover, selected opacity levels
- Zero risk to light-mode rendering (separate code path)

