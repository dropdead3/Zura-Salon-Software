

## Shift from Stroke Trace to Reflective Shine

### Current Problem
The effect traces a rotating arc around the button's border (stroke). The user wants a **reflective shine** — a light sweep that glides across the button's *surface*, like light catching polished metal.

### Approach
Replace the border-tracing conic-gradient with a **linear-gradient sweep** that translates horizontally across the button face. This is the classic "shimmer" or "light reflection" effect — a bright band that slides left-to-right over the surface.

### Changes

**File: `src/styles/silver-shine.css`**
- Replace `@keyframes silver-shine-rotate` with a `silver-shine-sweep` that translates a `::after` pseudo-element from left to right
- Remove the conic-gradient border approach entirely
- Remove `padding: 1px` and the static base stroke background — no longer a stroke effect
- Add `::after` pseudo on `.silver-shine-border` with a diagonal linear-gradient (transparent → white highlight → transparent) that slides across the full button surface
- Keep hover pause/fade, active fade, and `prefers-reduced-motion` behavior
- Animation: ~4s duration, ease-in-out, infinite, with a long pause between sweeps (use keyframe percentages so the shine only moves during 30% of the cycle, idle 70%)

**File: `src/components/dashboard/SilverShineButton.tsx`**
- Remove `p-[1px]` from the button class (no longer a border technique)
- Remove `silver-shine-inner` wrapper — the inner span just needs `relative z-10`
- Keep rounded-md, bg-background, and existing sizing
- Add a subtle static border (`border border-border/40`) so the button still has definition

### Technical Detail
```css
@keyframes silver-shine-sweep {
  0%   { transform: translateX(-100%) skewX(-15deg); }
  30%  { transform: translateX(200%) skewX(-15deg); }
  100% { transform: translateX(200%) skewX(-15deg); }
}

.silver-shine-border {
  position: relative;
  overflow: hidden;
}

.silver-shine-border::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 60%;
  background: linear-gradient(
    105deg,
    transparent 20%,
    hsl(0 0% 100% / 0.08) 40%,
    hsl(0 0% 100% / 0.15) 50%,
    hsl(0 0% 100% / 0.08) 60%,
    transparent 80%
  );
  animation: silver-shine-sweep 5s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}
```

The inner content gets `z-index: 2` to stay above the sweep.

### Files Changed

| File | Action |
|------|--------|
| `src/styles/silver-shine.css` | Replace stroke trace with surface shine sweep |
| `src/components/dashboard/SilverShineButton.tsx` | Remove padding-based stroke structure, add subtle static border |

