

## Fix Bottom Gradient Overlaying Cards and "View All" Link

The bottom gradient fade in `StylistsSection.tsx` (line 517-522) has `z-10`, which places it on top of the stylist cards and the "View all stylists" link, making the link nearly invisible and bleeding onto the card bottoms.

### Root Cause

Line 519: `z-10` on the gradient overlay puts it above all content within the section.

### Technical Change

**File: `src/components/home/StylistsSection.tsx`**

1. **Remove `z-10`** from the bottom gradient div (line 519). Change to `z-0` so it sits behind the section content (cards, links, etc.) rather than on top.
2. The "View all stylists" link container (line 697) and the card grid already have default stacking, so they will naturally appear above a `z-0` element.

Single class change: `z-10` → `z-0` on line 519.

### Files Changed
- `src/components/home/StylistsSection.tsx` -- one class change on the bottom gradient overlay

