

## Fix: Silver Shine Not Covering Full Stroke

### Root Cause

The `::before` pseudo-element inherits the button's rectangular shape via `inset: -1px`. A conic-gradient radiates from center — on a wide rectangle, the gradient circle clips at the left/right edges before reaching the top/bottom edges (or vice versa). This means the shine only visibly travels along ~2 of the 4 sides.

### Fix

Make the `::before` pseudo-element a large square (equal to the button's diagonal) and center it. This ensures the rotating gradient sweeps evenly across all four edges regardless of aspect ratio. `overflow: hidden` on the parent still clips it to the button bounds.

**File: `src/styles/silver-shine.css`** — Replace `inset: -1px` with explicit sizing

```css
.silver-shine-border::before {
  content: '';
  position: absolute;
  /* Center a square large enough to cover the diagonal */
  top: 50%;
  left: 50%;
  width: max(200%, 200vh);
  height: 0;
  padding-bottom: max(200%, 200vh); /* force square */
  transform: translate(-50%, -50%);
  border-radius: 0; /* no longer inheriting — it's a big rotating square */
  background: conic-gradient(
    transparent 0deg,
    transparent 320deg,
    hsl(0 0% 70% / 0.15) 332deg,
    hsl(0 0% 80% / 0.35) 345deg,
    hsl(0 0% 90% / 0.45) 352deg,
    hsl(0 0% 80% / 0.35) 358deg,
    transparent 360deg
  );
  animation: silver-shine-rotate 12s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.3s ease;
}
```

Key change: Instead of `inset: -1px` (which makes the pseudo match the button's rectangle), we create an oversized square centered on the button. The conic-gradient now rotates as a perfect circle that extends well past all four edges, so the shine sweeps evenly along top, right, bottom, and left.

### Files Changed

| File | Action |
|------|--------|
| `src/styles/silver-shine.css` | Replace `inset: -1px` with centered oversized square |

