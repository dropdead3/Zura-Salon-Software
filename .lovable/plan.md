

# Replace Sticky Sidebar with Full-Width Layout + Sticky Bottom Banner

## Current State
The page uses a two-column layout (`grid-cols-1 lg:grid-cols-[1fr_360px]`) with the ROI calculator in a sticky right sidebar on desktop, and a mobile sticky bottom bar with expandable sheet.

## Changes (`BackroomPaywall.tsx`)

### 1. Remove the two-column grid — go full-width single column
- Change line 494 from `grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8` to just a single `space-y-6` wrapper (no grid).
- Remove the entire right column block (lines 984–1037) containing the sticky desktop calculator card.

### 2. Inline the calculator content into the main flow
- Move `{calculatorContent}` (location selector, scale selector, sliders) into the left column content as a regular section — probably after the "Your Salon's Numbers" section or near the pricing breakdown area. Wrap it in a Card like the other sections.

### 3. Replace mobile sticky bar with a universal sticky bottom banner
- Remove the entire mobile-only sticky bottom bar block (lines 1041–1149).
- Add a new **always-visible** sticky bottom banner (all screen sizes) that shows:
  - Yearly estimated savings (e.g. `$4,500/yr savings`)
  - Yearly revenue/cost info
  - "Unlock Zura Backroom" CTA button
  - The `BackroomCheckoutConfirmDialog` trigger
- Style: `fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-xl` with a clean horizontal layout.
- Account for the platform sidebar offset on desktop (`ml-56` / `ml-16` depending on collapsed state — or just use full-width since it sits in the main content area).

### 4. Add bottom spacer
- Keep a bottom spacer div (`h-20` or similar) at the end of the page content so the sticky banner doesn't overlap the last section.

### 5. Remove `mobileCalcOpen` state
- The expandable mobile sheet is no longer needed since the calculator is inline. Clean up the `mobileCalcOpen` state and related toggle logic.

## Sticky Banner Layout
```text
┌─────────────────────────────────────────────────────────────┐
│  Est. Savings: $X,XXX/yr    Net Benefit: +$X,XXX/yr   [Unlock Zura Backroom →] │
│  30-day money-back guarantee · Cancel anytime                                   │
└─────────────────────────────────────────────────────────────┘
```

## Files Changed
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

