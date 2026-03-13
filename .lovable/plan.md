

# Unify Bento Radius Sizes Across Backroom Settings

## Problem
Three different border-radius values are used on the same page:
- `Infotainer` uses `rounded-2xl` (30px)
- `Card` wrapper token uses `rounded-xl` (20px)
- Inner items, icon boxes, buttons use `rounded-lg` (10px)

The screenshot shows the Infotainer banner and the Wizard CTA card sitting next to the Setup Progress card with visibly different corner radii. They should all match.

## Fix
Standardize the `Infotainer` component to use `rounded-xl` (matching `tokens.card.wrapper`) instead of `rounded-2xl`. This is the only change needed — all Card-based surfaces already use `rounded-xl` via the token, and inner elements correctly use `rounded-lg` for the nested level.

The intended radius hierarchy:
- **Level 0 (top-level cards, banners):** `rounded-xl` (20px)
- **Level 1 (inner cards, rows, icon boxes):** `rounded-lg` (10px)
- **Level 2 (small elements, badges):** `rounded-md` (5px)

## File to Modify

| File | Change |
|------|--------|
| `src/components/ui/Infotainer.tsx` | Line 29: `rounded-2xl` → `rounded-xl` |

Single line change. Every Infotainer across all 12 backroom sections inherits the fix automatically.

