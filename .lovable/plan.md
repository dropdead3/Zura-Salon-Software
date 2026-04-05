

# Add Hover Scatter Animation to Chaos Cards + Flex Layout Fix

## Changes

### `src/components/marketing/ChaosToClarity.tsx`

**1. Switch chaos cards from absolute positioning to flex-wrap layout**
- Replace scattered absolute-positioned cards with a `flex flex-wrap gap-2` container below the "Your Monday Morning" title.
- Each card keeps a slight inline `rotate()` transform for the messy aesthetic.
- Title gets `relative z-10` and slightly larger text (`text-xs`) so it's never obscured.

**2. Add hover scatter animation to individual cards**
- Convert each card `div` to a `motion.div`.
- On `whileHover`, apply a random small translation + rotation bump (e.g., `x: ±6px`, `y: ±4px`, `rotate: ±3deg` added to base rotation) with a quick 150ms spring transition.
- This creates a "flinch" or "scatter" effect — cards jitter away when the cursor touches them, reinforcing the chaos metaphor.
- Transition uses `duration: 0.15` with no bounce (per motion standards — no elastic/physics bounce).

**3. Add a subtle ambient float animation**
- Each card gets a slow idle `animate` loop: `y: [0, -3, 0]` over 3–4s with staggered delays, so the pile feels alive even before hover.
- On hover, the idle animation is overridden by the scatter displacement.

## Technical Notes

- Uses `motion.div` from framer-motion (already imported).
- Hover values are deterministic per card (seeded from index) so behavior is consistent, not random on each hover.
- Spring config: `duration: 0.15, ease: "easeOut"` — no bounce per motion standards.

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/ChaosToClarity.tsx` | **Modify** — flex-wrap layout, prominent title, hover scatter + idle float on cards |

**1 file modified.**

