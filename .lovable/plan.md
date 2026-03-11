

## Match Hover Highlight Corners to Card Radius

The breakdown rows use `rounded-xl` (12px) which creates pill-like highlights that visually clip against the card's inner edges. Change to `rounded-lg` (8px) to match the bento card's interior radius, giving a more cohesive inset look.

### Changes — `src/components/dashboard/AggregateSalesCard.tsx`

**Line 1061 (Services rows):**
- `rounded-xl` → `rounded-lg`

**Line 1126 (Retail rows):**
- `rounded-xl` → `rounded-lg`

Two class swaps, same file.

