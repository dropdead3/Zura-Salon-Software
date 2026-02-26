

## Fix: Silver Shine Stroke Visibility

### Diagnosis

The component structure is correct (1px padding channel, inner mask, rotating conic gradient). The problem is pure **contrast**: the gradient peaks at `hsl(0 0% 85% / 0.18)` — on a 4% lightness dark background, that's nearly invisible. The arc is also too narrow (25° of 360°).

### Changes

**File: `src/styles/silver-shine.css`** — Increase gradient opacity and widen the arc

```css
/* Current (too faint): */
background: conic-gradient(
  transparent 0deg,
  transparent 335deg,
  hsl(0 0% 75% / 0.12) 345deg,
  hsl(0 0% 85% / 0.18) 352deg,
  hsl(0 0% 80% / 0.14) 356deg,
  transparent 360deg
);

/* Fixed (visible but still restrained): */
background: conic-gradient(
  transparent 0deg,
  transparent 320deg,
  hsl(0 0% 70% / 0.15) 332deg,
  hsl(0 0% 80% / 0.35) 345deg,
  hsl(0 0% 90% / 0.45) 352deg,
  hsl(0 0% 80% / 0.35) 358deg,
  transparent 360deg
);
```

Key adjustments:
- Peak opacity raised from 0.18 → 0.45 (still subtle on dark surfaces — yields ~40% of a white pixel)
- Arc widened from ~25° to ~40° for a softer, more visible sweep
- Gradient has a smoother bell-curve falloff (feathered edges)

No other files change.

### Files Changed

| File | Action |
|------|--------|
| `src/styles/silver-shine.css` | Increase gradient opacity and widen arc |

