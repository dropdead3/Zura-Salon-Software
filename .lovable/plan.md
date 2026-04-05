

# Animate the DashboardMockup: Data → Intelligence → Action Narrative

## Concept
Transform the static DashboardMockup into a looping 3-act animation that tells Zura's core story:

1. **ACT 1 — OBSERVE** (~3s): KPI tiles count up from zero. Chart line draws itself left-to-right. The dashboard "comes alive" with data flowing in.
2. **ACT 2 — DETECT + RECOMMEND** (~3s): A scanning pulse sweeps across the data. The Utilization KPI flashes amber (highlighting a problem). The Primary Lever card glows and slides into focus with the recommendation: "Increase Tuesday utilization by 12%." A confidence bar fills. This is Zura telling you what to do.
3. **ACT 3 — ACT + IMPROVE** (~3s): A cursor appears, clicks "Apply" on the lever card. The Utilization value ticks from 75% → 87%. The Revenue value climbs from $248K → $284K. Chart line redraws with an upward shift. A green "Applied" checkmark appears on the lever. The numbers settle — the business improved.

Then a brief pause (~2s) and the loop resets.

## Technical Approach

### Rewrite `src/components/marketing/DashboardMockup.tsx`
- Use React `useState` + `useEffect` with a single `phase` state cycling through `'observe' | 'detect' | 'act' | 'pause'`
- CSS transitions and keyframe animations handle all motion (no framer-motion dependency needed for this component)
- Animated number counter utility (simple requestAnimationFrame-based interpolation) for KPI values
- SVG `stroke-dasharray` / `stroke-dashoffset` animation for the chart line draw effect
- CSS classes toggled per phase to control opacity, glow, scale, and color shifts

### Animation Details

**Act 1 — Observe (0-3s)**
- KPI values animate from 0 to "before" values ($248K, 75%, 2,847, 31.1%)
- Chart SVG path draws via stroke-dashoffset transition
- Staggered: each KPI tile fades in 200ms apart

**Act 2 — Detect (3-6s)**
- A subtle horizontal scan line sweeps down the mockup (CSS gradient animation)
- Utilization KPI border pulses amber briefly (detected problem)
- Lever card transitions from opacity-0/translateY(8px) to full visibility
- Confidence bar fills from 0% to 75%
- Small "Zura detected" label fades in above the lever card

**Act 3 — Act (6-9s)**
- A fake cursor element appears, moves toward and "clicks" an "Apply" button on the lever card
- Utilization value counts up: 75% → 87%
- Revenue value counts up: $248K → $284K
- Margin ticks: 31.1% → 34.2%
- Chart path morphs to a higher trajectory (second SVG path, cross-faded)
- Lever card shows green checkmark + "Applied" state
- Change indicators (+12%, +4%, +2.1%) fade in beneath values

**Pause (9-11s)**
- Everything holds for 2 seconds, then all elements fade to initial state and loop restarts

### CSS Additions to `src/index.css`
- `@keyframes mktScanLine` — horizontal gradient sweep
- `@keyframes mktCursorMove` — cursor position animation
- `@keyframes mktPulseAmber` — amber border pulse for detected KPI
- Utility classes for phase-based transitions

### No changes needed to:
- `PlatformPreview.tsx` or `HeroSection.tsx` — they just render `<DashboardMockup />` and the animation is self-contained
- No new dependencies

## Component Structure

```text
DashboardMockup
├── Title bar (static)
├── KPI Row (4 tiles)
│   └── Each: animated value + phase-dependent border color
├── Chart area
│   └── Two SVG paths (before/after) cross-faded by phase
├── Lever card
│   └── Phase-dependent: hidden → visible → "Applied" state
├── Scan line overlay (Act 2 only)
├── Fake cursor element (Act 3 only)
└── Phase timer (useEffect interval)
```

## Key Decisions
- Pure CSS transitions + React state — no animation library needed
- Self-contained loop with ~11s cycle — engaging without being distracting
- The "cursor click" is a simple div with a pointer SVG shape, not an actual interaction
- Respects `prefers-reduced-motion`: if enabled, shows the final "after" state statically
- Mobile: cursor animation hidden on small screens (the number transitions still play)

