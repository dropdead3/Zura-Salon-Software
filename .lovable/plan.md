

# Tool Consolidation — Scroll-Driven Convergence Animation

## Concept

The 9 scattered tool pills start in a chaotic, jumbled state (random rotations, offsets, overlapping). As the user scrolls the section into view, the pills animate inward — shrinking, losing their individual colors, and converging into a single glowing "Zura $99/mo" pill that replaces them all. A visual metaphor for consolidation.

## Animation Sequence (3 phases, scroll-triggered)

**Phase 1 — Chaos (initial state, before in-view)**
- Pills visible but scattered: large random offsets (x: -120 to +120, y: -80 to +80), random rotations (-15 to +15 deg), slight overlap
- Each pill has its own color and price tag
- Feels messy, expensive, overwhelming

**Phase 2 — Convergence (on scroll into view, ~1.2s staggered)**
- Pills animate toward center: x/y go to 0, rotation goes to 0
- Pills shrink (scale 0.8 → 0.4) and fade out (opacity 1 → 0)
- Staggered timing so they don't all collapse at once — feels like being "absorbed"

**Phase 3 — Zura pill reveal (after convergence completes, ~0.3s delay)**
- A single large "Zura — $99/mo" pill fades + scales in at center
- Uses violet/purple gradient border matching Zura brand
- Clean, confident, singular — the visual payoff
- Price comparison row fades in below

## Technical Approach

- Use Framer Motion `useInView` (already imported) to trigger the sequence
- `useState` to track animation phase: `'chaos' | 'converging' | 'resolved'`
- Each pill uses `motion.div` with `animate` controlled by phase state
- Chaos positions defined as larger offsets in the tool data (increase current x/y/rotate values)
- Convergence: animate to `{ x: 0, y: 0, rotate: 0, scale: 0.4, opacity: 0 }` with stagger
- After last pill finishes (onAnimationComplete on the last one), set phase to `'resolved'`
- Zura pill: `AnimatePresence` conditional render when phase === 'resolved'
- Container uses `position: relative` with pills absolutely positioned for true overlap during chaos

## Layout Change

- Switch from `flex-wrap` to a `relative` container with fixed height
- Pills use `absolute` positioning with transform offsets for the chaos state
- This allows true overlapping scatter rather than flex-wrap grid

## File Changes

| File | Action |
|------|--------|
| `src/components/marketing/ToolConsolidation.tsx` | **Rewrite** — add 3-phase scroll animation, absolute positioning, Zura pill reveal |

**1 file modified. 0 new. 0 deleted.**

