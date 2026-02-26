

## Disco Ball Animation for PixelZMark

The user wants the Z-shaped cells in `PixelZMark` to animate with a "disco ball" lighting-up effect — individual squares randomly brightening and dimming, creating a shimmering sparkle pattern.

**Note:** The screenshot shows a `getAccessBadgeColor is not a function` crash. I reviewed the codebase and this function is defined but never called in current code — this is likely a stale build cache issue. If the error persists after this change, we can investigate further.

### File: `src/components/ui/PixelZMark.tsx`

**Current behavior:** Z-cells gently bob up/down with a slow wave (3.2s cycle, sequential delay).

**New behavior:** Z-cells ("1" cells) randomly pulse between low and high opacity/brightness with staggered, randomized timing — mimicking light reflecting off a disco ball.

- Replace the current `y: [0, -2, 0]` wave animation with a brightness/opacity shimmer:
  - `opacity: [0.3, 1, 0.5, 1, 0.3]` — irregular flicker pattern
  - `scale: [1, 1.1, 1, 1.05, 1]` — subtle size pulse for "glow" feel
- Randomize each cell's `duration` (1.5–3.5s range) and `delay` (0–2s range) using a seeded random per cell index, so the pattern feels organic and non-uniform
- Add a subtle `boxShadow` animation on lit cells for a glow halo effect
- Keep `useReducedMotion` guard — falls back to static rendering

### Technical detail

- Use a deterministic pseudo-random (based on cell index) so the pattern is consistent across renders but still looks randomized
- No new dependencies needed — framer-motion handles all animation

