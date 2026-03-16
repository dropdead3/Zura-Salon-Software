

# Hero Section Enhancement Plan

## Current State (from screenshot)
The hero has a 2-column grid: large headline left, animated card right. Issues:
- The card feels visually lightweight compared to the massive headline — imbalanced
- The card interior is sparse with lots of dead space around centered content
- Dot indicators are tiny and disconnected from the card
- No visual anchoring between left and right columns
- The testimonial section feels tacked on below the CTA
- The gradient background is barely perceptible

## Improvements

### 1. Rebalance Visual Weight
- Give the card a stronger border treatment (`border-border/60`) and slightly larger min-height (`360px`) so it anchors against the headline
- Add a subtle inner glow gradient at the top of the card to give it more presence

### 2. Integrate Step Indicators Into the Card
- Move the dot indicators and label *inside* the card as a footer bar, creating a self-contained interactive unit instead of loose dots floating below

### 3. Tighten Left Column Spacing
- Reduce `space-y-8` to `space-y-6` for tighter vertical rhythm
- Move the testimonial into a more integrated position with a subtler divider

### 4. Improve Card Content Layout
- Make the inner mock panels slightly wider (`max-w-[300px]` instead of `260px`) so they fill the card better
- Improve the weight display with better typographic contrast

### 5. Add Subtle Visual Polish
- Strengthen the radial gradient background to be slightly more visible
- Add a faint grid or noise texture to the card background for depth

## Files Changed
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — Hero section (lines 376–563)

