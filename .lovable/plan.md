

## Fix Card Padding for Visual Equality

The issue: `px-5 pb-5` gives 20px on sides and bottom, but the rounded-full button and bottom card radius create the optical illusion that the bottom has less breathing room than the sides. The specialty badges at the top use `top-4 left-4` (16px), adding to the inconsistency.

### Technical Change

**File: `src/components/home/StylistFlipCard.tsx`** (line 114)

Change the bottom overlay padding from `px-5 pb-5 pt-6` to `px-6 pb-7 pt-6`:
- `px-6` (24px sides) -- matches a more generous inset, aligns better with badge `left-4 right-4` plus badge internal padding
- `pb-7` (28px bottom) -- optically compensates for the card's bottom border-radius eating into the visual space, so the button appears equidistant from the edge as the side content does

Also update the specialty badge container (line 72) from `top-4 left-4 right-4` to `top-5 left-5 right-5` so the top badges align with the increased side padding.

### Files Changed
- `src/components/home/StylistFlipCard.tsx` -- increase padding on overlay and badge positioning

