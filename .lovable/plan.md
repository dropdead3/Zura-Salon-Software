

## Revert to Stroke-Based Shine Effect

The surface sweep was the wrong direction. You want the shine to travel along the **border/stroke only**, with the stroke always visible. Let me revert and improve the stroke approach.

### Changes

**File: `src/styles/silver-shine.css`**
- Revert to the two-layer stroke system: static silver base stroke (always visible) + rotating conic-gradient highlight
- Use the oversized centered square technique for even coverage on all 4 sides
- `padding: 1px` reveals the gradient layers as a 1px stroke
- Keep hover pause/fade and reduced-motion behavior

**File: `src/components/dashboard/SilverShineButton.tsx`**
- Revert to `p-[1px]` padding-based stroke reveal (remove `border border-border/40 bg-background`)
- Restore `silver-shine-inner` wrapper with `bg-background` and proper border-radius to mask the interior
- Inner content sits above stroke layers via `z-index`

### Restored CSS Structure
```css
.silver-shine-border {
  position: relative;
  /* Static silver base stroke */
  background: linear-gradient(135deg, hsl(0 0% 45%/0.5), hsl(0 0% 65%/0.6), hsl(0 0% 50%/0.5));
  padding: 1px;
  overflow: hidden;
}

.silver-shine-border::before {
  /* Oversized rotating conic-gradient for even sweep on all edges */
  position: absolute;
  top: 50%; left: 50%;
  width: max(300%, 300vh);
  padding-bottom: max(300%, 300vh);
  transform: translate(-50%, -50%);
  background: conic-gradient(/* highlight arc */);
  animation: silver-shine-rotate 12s ease-in-out infinite;
}

.silver-shine-inner {
  position: relative; z-index: 1;
  background: bg-background;
  border-radius: inherit;
}
```

### Files Changed

| File | Action |
|------|--------|
| `src/styles/silver-shine.css` | Revert to stroke-only rotating shine |
| `src/components/dashboard/SilverShineButton.tsx` | Restore padding + inner wrapper structure |

