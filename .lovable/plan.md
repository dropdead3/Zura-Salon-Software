

# Fix Hero Card Glow Hard Edge

## Problem
The ambient glow orb behind the hero card (line 434) is positioned at `right-0` but the parent `<section>` on line 410 has `overflow-hidden`, clipping the glow and creating a hard right edge.

## Fix — Two lines

1. **Line 410**: Change `overflow-hidden` to `overflow-visible` on the hero section so the glow can bleed naturally. Alternatively, if overflow-hidden is needed for other elements, we can move it only to specific children.

2. **Line 434**: Shift the glow orb slightly left so it's centered behind the card rather than anchored to the right edge. Change `right-0` to `right-1/2 translate-x-1/2` (or just `left-1/2 -translate-x-1/2`) so it sits centered, and the blur fades evenly on all sides.

### File
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — lines 410, 434

