

## Improve Stroke Highlight: Reflective Shine Instead of Tracer

### Problem
The current conic-gradient uses a narrow ~60° arc (300°–360°) that reads as a small bright dot tracing the perimeter. A real reflective shine on metal is a **wide, soft wash** — like light glancing off a ring — not a pinpoint tracer.

### Approach
Widen the highlight arc dramatically and soften the gradient transitions so it looks like a broad band of light sweeping across the stroke, similar to how light reflects off polished jewelry.

### Changes — `src/styles/silver-shine.css` only

1. **Widen the conic-gradient arc** from ~60° to ~150°, creating a broad luminous wash instead of a tight tracer dot:
   - Bright zone spans roughly 180°–360° with soft ramps on both edges
   - Peak opacity stays restrained (~0.5) for subtlety
   - The opposite side stays fully transparent, creating a natural "lit vs unlit" hemisphere

2. **Slow the rotation slightly** (12s → 14s) — broader highlights look better at a more leisurely pace

3. **Add a secondary `::after` layer** with a much wider, lower-opacity wash offset by ~90° to simulate ambient light scatter (the soft secondary reflection you see on polished metal alongside the primary highlight)

4. Everything else stays identical: static base stroke, hover pause/fade, active fade, reduced-motion fallback, inner wrapper structure.

### Resulting Gradient (primary)
```css
background: conic-gradient(
  transparent 0deg,
  transparent 150deg,
  hsl(0 0% 65% / 0.12) 180deg,
  hsl(0 0% 75% / 0.3) 220deg,
  hsl(0 0% 85% / 0.45) 260deg,
  hsl(0 0% 95% / 0.5) 290deg,
  hsl(0 0% 85% / 0.35) 320deg,
  hsl(0 0% 70% / 0.15) 345deg,
  transparent 360deg
);
```

### Secondary ambient wash (`::after`)
```css
background: conic-gradient(
  transparent 0deg,
  transparent 60deg,
  hsl(0 0% 80% / 0.08) 90deg,
  hsl(0 0% 85% / 0.12) 140deg,
  hsl(0 0% 80% / 0.08) 190deg,
  transparent 220deg,
  transparent 360deg
);
```

### Files Changed

| File | Action |
|------|--------|
| `src/styles/silver-shine.css` | Widen primary arc, add secondary ambient `::after` layer, adjust timing |

No changes to `SilverShineButton.tsx`.

