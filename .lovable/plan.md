

# Fix: "Supply Library" Button Overflowing Card Edge

## Root Cause
At the current viewport (1173px), the `sm:` breakpoint is active so the header renders horizontally. The title block (icon + "Backroom Product Catalog" + description) doesn't have `min-w-0`, so it refuses to shrink below its intrinsic width. This pushes the badge + "Supply Library" button past the card's right edge.

## Fix in `BackroomProductCatalogSection.tsx` (line ~295)

Add `min-w-0` to the title's flex child so it can shrink, and `flex-shrink-0` on the button group so it keeps its size:

```tsx
// Line 295: add min-w-0
<div className="flex items-center gap-3 min-w-0">

// Line 306: add flex-shrink-0  
<div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
```

This is a two-line className change — the title block becomes shrinkable while the buttons stay intact.

