

## Increase Bottom Padding on Card

The "Not Booking" button is too close to the card's bottom edge. The current `pb-7` (28px) needs to increase to `pb-9` (36px) to give the button more breathing room against the rounded card corner.

### Technical Change

**File: `src/components/home/StylistFlipCard.tsx`** (line 114)

Change `pb-7` to `pb-9` on the bottom overlay container. This increases the bottom padding from 28px to 36px, giving the button adequate clearance from the card's border-radius.

### Files Changed
- `src/components/home/StylistFlipCard.tsx` -- one class change (`pb-7` → `pb-9`)

