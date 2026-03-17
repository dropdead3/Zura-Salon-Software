

## Reposition Badge and Center Brand Name

### Change in `BackroomProductCatalogSection.tsx` (lines 1166-1171)

- Move the product count badge to absolute top-right position (like the "Missing Data" badge), using `absolute top-2 right-2`
- Keep brand name and logo centered in the card (they already are via flex centering)
- When both "Missing Data" and product count badges exist, stack them: move product count to `top-2 left-2` or keep both top-right with slight offset — since "Missing Data" is conditional, product count takes `top-2 right-2` and "Missing Data" moves to `top-2 left-2`

Actually simpler: put the product count badge at `absolute top-2 right-2` and keep "Missing Data" at `absolute top-2 left-2`.

**Line 1152-1155**: Change "Missing Data" badge position from `top-2 right-2` to `top-2 left-2`

**Lines 1168-1171**: Change product count badge to `absolute top-2 right-2` and remove it from the flex flow

This keeps brand name + logo perfectly centered in the card.

