

# Fix: Header Components Overlapping

## Problem
At 1173px, `sm:flex-row` + `sm:items-center` makes the header a single horizontal row, but the title block (icon + title + multi-line description) is too wide, causing the description to visually collide with the badge and button.

## Fix — `BackroomProductCatalogSection.tsx`

Change `sm:items-center` to `sm:items-start` on line 294 so the badge/button group aligns to the top of the title block instead of vertically centering over the wrapping description:

```tsx
// Line 294: items-start instead of items-center
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
```

This keeps the badge and "Supply Library" button pinned to the top-right of the card header, while the description text flows naturally below the title without collision.

