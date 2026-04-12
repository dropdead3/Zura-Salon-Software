

# Growth Estimator — Build Plan

## What We're Building

An interactive "See Your Growth Potential" section for the sales page. Users input basic business data and receive a modeled, conservatively calculated estimate of revenue opportunity — broken into demand generation, conversion, and capacity optimization. Legally cautious language throughout. Premium two-column layout matching existing marketing aesthetic.

## Placement

Between `StruggleInput` and `StatBar` in `PlatformLanding.tsx` — early in the funnel after the user has described their struggle, before proof sections. This positions it as a natural "what if" moment.

## Component: `GrowthEstimator.tsx`

Single file in `src/components/marketing/`. Follows established patterns: `useScrollReveal`, `mkt-reveal`, `motion` from framer-motion, explicit marketing palette colors, `font-display` for headlines, `font-sans` for body.

### Layout

Two-column on desktop (inputs left, output right). Stacked on mobile (inputs first, output below).

### Left Column — Inputs

- **Monthly Revenue**: Numeric input with `$` prefix, formatted. Default placeholder: `$25,000`
- **Number of Stylists**: Numeric input. Default placeholder: `4`
- **Primary Service Focus**: Dropdown (Extensions, Color, Blonding, Mixed). Default: Mixed
- **Booking Utilization**: Slider 30-100%, default 65%. Label shows current value.

All inputs styled with the dark marketing card aesthetic (bg-white/[0.03], border-white/[0.06]).

### Right Column — Output

**Primary**: "Estimated Monthly Growth Opportunity" → `+$X,XXX` in violet gradient text, animated via `AnimatedNumber`.

**Breakdown** (3 stacked cards):
- Demand Generation (SEO & visibility) — percentage + dollar amount
- Conversion Improvements (rebooking, reviews) — percentage + dollar amount  
- Capacity Optimization (booking efficiency) — percentage + dollar amount

Each card: icon, label, estimated dollar range, subtle progress indicator.

**Secondary layer** (conditional, shows when opportunity > $3,000):
"With expansion and funding, this opportunity could increase further" → `+$X,XXX additional potential`

**Disclaimer** (always visible, below output):
"This estimate is based on modeled scenarios using your inputs and common optimization patterns. Actual results will vary based on execution, market conditions, and individual business factors."

**Expandable disclosure**: "How this is calculated" toggle → methodology text.

### Calculation Logic (conservative, deterministic)

```text
Base opportunity % varies by service type:
  Extensions: 18-28%
  Color: 12-22%
  Blonding: 15-25%
  Mixed: 14-24%

Utilization adjustment:
  Lower utilization → higher capacity opportunity
  capacityMultiplier = 1 + (1 - utilization) * 0.4

Diminishing returns at scale:
  scaleMultiplier = 1 - (revenue / 500000) * 0.3  (floor 0.5)

Breakdown split:
  Demand: 40% of total
  Conversion: 35% of total
  Capacity: 25% of total

Expansion potential (secondary):
  expansionMultiplier = 0.4 of base opportunity
```

All outputs clamped to reasonable ranges. Never exceeds 35% of input revenue.

### CTA Block

Below output:
- Primary: "Get My Growth Plan" → `/demo`
- Secondary: "See How Zura Works" → `/explore`

### Conversion Bridge

Below CTA: "When the opportunity is large enough, Zura helps you act on it — including access to funding when appropriate."

## Files

| File | Action |
|---|---|
| `src/components/marketing/GrowthEstimator.tsx` | CREATE |
| `src/pages/PlatformLanding.tsx` | UPDATE — import + place between `StruggleInput` and `StatBar` |

## Technical Notes

- Uses `useState` for inputs, `useMemo` for calculations
- `AnimatedNumber` for smooth value transitions
- `useScrollReveal` + `mkt-reveal` for scroll-triggered reveals
- `useIsMobile` for responsive layout
- `motion` from framer-motion for card animations
- `Collapsible` from radix for "How this is calculated" toggle
- All explicit marketing palette colors (no theme tokens)
- No new dependencies

