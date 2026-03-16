

# Sticky ROI Calculator — Sales Page Revamp

## Problem
Currently everything is stacked vertically in a single column. When users scroll down to select locations and configure scales, the savings/ROI numbers are above and out of view. The impact is lost.

## Solution: Two-Panel Layout
Split into a left configuration column and a right sticky calculator panel. As users scroll through features, locations, and scale options on the left, the right panel stays fixed showing real-time cost, savings, and ROI — always visible.

```text
┌──────────────────────────────────────────────────────────────────┐
│  Hero: "Unlock Zura Backroom" (full width, centered)            │
├────────────────────────────┬─────────────────────────────────────┤
│  LEFT (scrollable)         │  RIGHT (sticky)                    │
│                            │                                    │
│  Feature Grid (4 cards)    │  ┌─ YOUR INVESTMENT ─────────────┐ │
│                            │  │ Location base × 2    $40/mo   │ │
│  Your Salon's Numbers      │  │ Usage fee (~142)     $71/mo   │ │
│  (activity metrics,        │  │ Scale license × 1    $10/mo   │ │
│   stylist slider)          │  │ ──────────────────────────     │ │
│                            │  │ Total               $121/mo   │ │
│  Pricing Overview          │  └───────────────────────────────┘ │
│                            │                                    │
│  Select Locations          │  ┌─ YOUR SAVINGS ────────────────┐ │
│  (checkbox list)           │  │ Waste reduction    −$341/mo   │ │
│                            │  │ Supply fee recovery −$2,840   │ │
│  Scale Configurator        │  │ ──────────────────────────     │ │
│                            │  │ Net benefit     +$3,060/mo    │ │
│  Money-Back Guarantee      │  │                               │ │
│                            │  │ ═══════════════════════════   │ │
│                            │  │ YEARLY IMPACT                 │ │
│                            │  │  +$36,720/year                │ │
│                            │  │  25× ROI                      │ │
│                            │  │                               │ │
│                            │  │ [Unlock $36K/yr in savings →] │ │
│                            │  └───────────────────────────────┘ │
├────────────────────────────┴─────────────────────────────────────┤
│  ROI callout (full width)                                       │
└──────────────────────────────────────────────────────────────────┘
```

## Layout Details

**Desktop (lg+):** Two-column grid `grid-cols-[1fr_380px]` with `gap-8`. Right column uses `sticky top-24` so the calculator card stays in viewport while scrolling.

**Mobile:** Single column, but the calculator becomes a sticky bottom bar showing the key number (net benefit + CTA button), with a tap-to-expand for full breakdown.

## Changes — `BackroomPaywall.tsx` only

### 1. Restructure to two-column layout
- Hero stays full-width above both columns
- Left column: Feature grid → Salon's Numbers → Pricing Overview → Location Selector → Scale Configurator → Money-Back Guarantee
- Right column: Single sticky card containing cost breakdown, savings projection, annual impact, ROI badge, and CTA button — all in one scrollable-if-needed card

### 2. Sticky calculator card (right column)
- `sticky top-24` positioning with `max-h-[calc(100vh-8rem)] overflow-y-auto`
- Sections: Investment (cost lines), Savings (waste + supply), divider, Annual Impact (large hero number), ROI multiplier badge, CTA button
- Updates reactively as locations/scales change
- Subtle emerald gradient border when net benefit > 0
- Animated numbers for all key figures

### 3. Mobile sticky bottom bar
- On mobile (`lg:hidden`), render a compact fixed bottom bar with:
  - Net monthly benefit (or "Select locations")
  - CTA button
  - Tap to expand full calculator via a slide-up sheet (reuse existing bottom layout)
- Hide the desktop right column on mobile (`hidden lg:block`)

### 4. Remove duplicate sections
- Cost breakdown, savings projection, annual impact, net benefit banner, and CTA currently embedded in the "Your Salon's Numbers" card — move all of these to the sticky calculator
- The left-side "Your Salon's Numbers" card keeps only the activity metrics (color services count, product spend, stylist slider)

### 5. Visual polish
- Calculator card gets a premium glass treatment: `bg-card/80 backdrop-blur-xl border-border/40`
- When savings are positive, card border shifts to `border-emerald-500/30` with subtle `shadow-emerald-500/5`
- Section dividers use thin `border-border/20` lines
- Annual impact section uses a gradient background `bg-gradient-to-br from-emerald-500/5 to-primary/5`

