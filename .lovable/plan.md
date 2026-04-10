

# Differentiate Favorite Cards with Amber/Gold Styling

## Summary
Update the favorite cards in the Favorites section to use a warm amber/gold accent — matching the star icon color — so they visually stand apart from the neutral cards below.

## Changes

### `src/pages/dashboard/admin/TeamHub.tsx`

Update the `renderFavoriteCard` function (line 271):

**Current:** `border-primary/20 bg-primary/5` — subtle, blends in with dark background

**New styling:**
- `border-amber-500/30` — warm gold border matching the star
- `bg-amber-500/[0.06]` — faint amber wash
- `dark:bg-amber-500/[0.08]` — slightly stronger in dark mode
- Icon box gets `bg-amber-500/15` background and `text-amber-500` icon color instead of default muted

This creates a cohesive amber "glow" card that ties to the filled star icon, making favorites unmistakably distinct from regular cards without being garish.

## Result
Favorite cards get a warm amber border and subtle amber background tint, clearly differentiating them from the neutral cards in the sections below.

