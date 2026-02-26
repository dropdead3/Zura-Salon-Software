

## Silver Shine Stroke on Insights Buttons

Both `AIInsightsDrawer` and `PersonalInsightsDrawer` use identical collapsed trigger buttons — plain `motion.button` elements with `border border-border` styling. These are standard HTML buttons, not SVG-based, so the cleanest approach is a **CSS-only conic-gradient border animation** using a pseudo-element.

### Approach: Shared `SilverShineButton` Wrapper Component

Create a reusable component that wraps the collapsed button content and provides the silver shine effect via CSS `@keyframes` on a pseudo-element.

**How it works:**
1. An outer `div` with `position: relative` and `overflow: hidden` acts as the border container
2. A `::before` pseudo-element carries a subtle conic gradient (transparent → silver → transparent) that rotates slowly via `@keyframes`
3. An inner `div` with the background covers everything except the 1px border area, creating a "stroke-only" shine
4. The shine cycle runs on a 12s loop with the gradient visible for only ~20-25% of the rotation (rest is transparent)
5. `prefers-reduced-motion` disables the animation entirely

### Files

**New: `src/components/dashboard/SilverShineButton.tsx`**

A wrapper component that:
- Accepts `children`, `onClick`, `className` props
- Renders the outer container with `::before` conic gradient rotation
- Inner content div masks everything except the 1px border
- Exports as a drop-in replacement for the current `motion.button`

**New: `src/styles/silver-shine.css`** (or inline via Tailwind arbitrary values)

```css
@keyframes silver-shine-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .silver-shine-border::before {
    animation: none !important;
    opacity: 0 !important;
  }
}
```

Key CSS properties on `::before`:
- `background: conic-gradient(transparent 0deg, transparent 340deg, hsl(0 0% 75% / 0.15) 350deg, hsl(0 0% 85% / 0.18) 355deg, transparent 360deg)`
- `animation: silver-shine-rotate 12s ease-in-out infinite`
- `position: absolute; inset: -1px; border-radius: inherit`

The gradient occupies only ~20° of the 360° sweep — so for most of the 12s cycle, nothing is visible. The peak opacity of 0.18 keeps it ultra-subtle.

**Modified: `src/components/dashboard/AIInsightsDrawer.tsx`**
- Line 309-323: Replace the `motion.button` with `SilverShineButton` wrapping the same children
- The `motion` animation (scale in/out) moves to an outer wrapper or is handled by `SilverShineButton` accepting framer-motion props

**Modified: `src/components/dashboard/PersonalInsightsDrawer.tsx`**
- Line 203-222: Same replacement — use `SilverShineButton` for the collapsed trigger

### Hover/Active States

- **Hover**: `animation-play-state: paused` on the `::before` — shine freezes and fades to 0 opacity over 300ms
- **Active/Pressed**: No shine, standard pressed state (existing `active:scale-[0.98]` or similar)
- **Focus**: Separate `focus-visible:ring-2` ring, independent of the shine pseudo-element

### Motion Timing Summary

| Parameter | Value |
|-----------|-------|
| Full cycle | 12s |
| Gradient arc | ~20° of 360° |
| Peak opacity | 0.18 |
| Easing | ease-in-out |
| Hover behavior | Pause + fade out |
| Reduced motion | Animation disabled, static border |

### What Does NOT Change

- Button dimensions, padding, typography
- Expanded drawer behavior
- Icon styling
- Layout of the `CommandCenterControlRow`

