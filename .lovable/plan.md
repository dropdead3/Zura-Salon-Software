

## Prompt feedback
Strong prompt: you specified the failure mode of the prior attempts ("if it looks like a simple left border, it's wrong"), gave geometry rules, and named a quality bar (Linear/Stripe). What would push this further: a one-line "anti-example" callout up top, e.g. *"Not a left-border. Not a left-bar with rounded ends. The accent is the card's edge bleeding inward."* That gives the implementer a single rejection test to apply at every step.

## Why prior attempts failed
- v1–v3 tried to fake the taper with **borders + linear-gradient masks**. A border is a stroke around a rect — it cannot taper to a point because mask gradients only fade opacity, they don't change shape. Result: stiff bracket marks.
- Borders and box-shadow can't produce a true **pointed/lenticular shape** that follows a 10px corner radius. SVG can.

## Approach — single inline SVG, shaped like a leaf/lens

One absolutely-positioned `<svg>` per card, sized to the card's full height, drawn with a single `<path>` that:

1. Starts at the top-left corner point (where the 10px radius ends along the top edge — i.e. ~10px down from the top, 0px from left).
2. Curves outward along the card's rounded top-left corner (matching the card's `rounded-[10px]`).
3. Runs straight down the left edge at `~3.5px` width (the meaty middle of the accent).
4. Curves back inward along the card's rounded bottom-left corner.
5. Returns up the inner edge with a smooth Bézier that **tapers the top and bottom into points** as it re-enters each corner.

Because it's one closed `<path>` filled with the accent color (no stroke), the top and bottom **naturally taper to a point** as the outer curve and inner curve meet inside the corner radius. The middle stays a clean 3.5px band. The corners read as the color "bleeding into the edge" — exactly the hug effect.

### Geometry (the math)

For a card of height `H` and corner radius `R = 10`:

- Outer path (left edge, follows the card silhouette):
  - `M 0,R` → `Q 0,0 R,0` (top-left corner curve, starting at the point where radius begins)
  - Wait — that's the card's outer corner. The accent must sit **inside** the card, not on its outline.

- Corrected: the accent's **outer edge** runs along the card's left interior (`x = 0`), and the **inner edge** runs at `x = W` where `W ≈ 3.5px`.
- The taper is achieved by having the top and bottom of the path meet at a single point on the diagonal of the corner radius (roughly `(R*0.3, R*0.3)` for top-left and `(R*0.3, H - R*0.3)` for bottom-left).

### Final path shape (parameterized in component)

```
const W = 3.5;   // accent width at middle
const R = 10;    // matches rounded-[10px]
const H = card height (from ResizeObserver or parent height: 100%)

d = `
  M ${R*0.3},${R*0.3}                       // top tip (inside top-left radius)
  Q 0,${R*0.5} 0,${R}                       // curve out to left edge below corner
  L 0,${H - R}                              // straight down left edge
  Q 0,${H - R*0.5} ${R*0.3},${H - R*0.3}    // curve in to bottom tip
  L ${W},${H - R - 2}                       // up inner edge to bottom of straight band
  L ${W},${R + 2}                           // straight up inner edge
  Z                                          // close back to top tip
`
```

This produces a **leaf/lens shape**: pointed at top, pointed at bottom, ~3.5px wide in the middle, hugging both rounded corners.

### Sizing without measuring height
SVG with `preserveAspectRatio="none"` and a viewBox of `0 0 W H` would distort the corner curves. Instead:
- Set `<svg className="absolute left-0 top-0 h-full" width={W + R}>` (fixed pixel width, full card height).
- Use **CSS variable** `--card-h` set on the parent via inline style, OR — simpler — render the path with absolute coordinates using the SVG's own `height: 100%` and a `viewBox` that reads the rendered height via `useLayoutEffect` + `ResizeObserver`.
- Cleanest: use the **`<svg>` with `height="100%"` and no viewBox**, drawing in real pixel coordinates with absolute path commands. The `<path>` is computed from a measured height (cheap one-time read per card via `useRef` + `useLayoutEffect`).

Trade-off: a `useLayoutEffect` per card adds work. **Better**: use a **two-circle CSS approach** where the accent is built from:
- A central `3.5px` wide rect (full card height minus 2×R)
- Two small filled SVG "corner caps" (`R × R`) at top-left and bottom-left, each containing a single tapered path that goes from the corner point inward.

This avoids re-measuring and works at any card height with zero JS. The three pieces visually fuse into one continuous tapered ribbon because they share color and align at sub-pixel boundaries.

### Recommended final implementation: **CSS + two SVG corner caps**

```jsx
<div className="absolute inset-y-0 left-0 pointer-events-none z-[3]" style={{ width: 10 }}>
  {/* Top corner cap — tapered point inside top-left radius */}
  <svg width="10" height="10" className="absolute top-0 left-0 block" viewBox="0 0 10 10">
    <path d="M 3,3 Q 0,5 0,10 L 3.5,10 Z" fill={accentColor} />
  </svg>
  
  {/* Middle band — full-width 3.5px stripe */}
  <div 
    className="absolute left-0" 
    style={{ 
      top: 10, 
      bottom: 10, 
      width: 3.5, 
      backgroundColor: accentColor 
    }} 
  />
  
  {/* Bottom corner cap — tapered point inside bottom-left radius */}
  <svg width="10" height="10" className="absolute bottom-0 left-0 block" viewBox="0 0 10 10">
    <path d="M 0,0 L 3.5,0 L 3,7 Q 0,5 0,0 Z" fill={accentColor} />
  </svg>
</div>
```

Three pieces, no measurement, no JS, perfectly aligned because they share the parent's `left: 0` anchor and the band's `top: 10 / bottom: 10` matches the corner caps' dimensions exactly.

The corner cap paths (`M 3,3 Q 0,5 0,10 L 3.5,10 Z`) draw a tapered triangle that:
- Starts at point `(3, 3)` — the inner tip
- Curves out through `(0, 10)` — the corner of the card
- Returns flat to `(3.5, 10)` — meeting the middle band cleanly
- Closes back to the tip

Result: a continuous, pointed-at-both-ends ribbon that hugs both rounded corners.

## File to change
`src/components/dashboard/schedule/AppointmentCardContent.tsx`

### 1. Build a small `LeftEdgeAccent` component (top of file, after imports)

```tsx
function LeftEdgeAccent({ color }: { color: string }) {
  return (
    <div
      className="absolute inset-y-0 left-0 pointer-events-none z-[4]"
      style={{ width: 10 }}
      aria-hidden
    >
      <svg width="10" height="10" viewBox="0 0 10 10" className="absolute top-0 left-0 block">
        <path d="M 3,3 Q 0,5 0,10 L 3.5,10 Z" fill={color} />
      </svg>
      <div
        className="absolute left-0"
        style={{ top: 10, bottom: 10, width: 3.5, backgroundColor: color }}
      />
      <svg width="10" height="10" viewBox="0 0 10 10" className="absolute bottom-0 left-0 block">
        <path d="M 0,0 L 3.5,0 L 3,7 Q 0,5 0,0 Z" fill={color} />
      </svg>
    </div>
  );
}
```

### 2. Resolve the accent color (one source, both branches)

```tsx
// Inside the grid card, before rendering:
const accentColor = useCategoryColor && !displayGradient
  ? catColor.text                          // category card → use the category's text token
  : statusColors.solid ?? 'currentColor';  // status card → use status accent

// (If statusColors doesn't already expose a solid hex/hsl, fall back to currentColor
// since status cards already set text color on the parent.)
```

### 3. Render `<LeftEdgeAccent />` once, after `CardOverlays`, before service bands

In the `gridContent` JSX (around line 690):

```tsx
<CardOverlays ... />
<LeftEdgeAccent color={accentColor} />
{serviceBands && useCategoryColor && ( ... )}
<GridContent ... />
```

Place it at `z-[4]` so it sits **above** the multi-service color bands (which span the full width and would otherwise hide it on the left edge), but below interactive content.

### 4. Cancelled / no-show handling

- Cancelled cards: add `opacity-60` to the accent (already inherited from the parent's `opacity-60` since the accent is a child).
- No-show cards: accent stays at full color — it actually helps reinforce the destructive ring.
- Selected cards: no change needed; the existing `ring-primary` reads above the accent.

### 5. Hide the accent for blocked categories (Block/Break)
Those cards already have a diagonal-cross overlay. Adding an accent muddies it. Wrap:

```tsx
{!BLOCKED_CATEGORIES.includes(appointment.service_category || '') && (
  <LeftEdgeAccent color={accentColor} />
)}
```

## What stays exactly the same
- Card padding, radius, shadow, hover lift, sheen, lit-edge ring
- 1px overlap gap math
- All status pills, NC/RC chips, stylist avatars, multi-service bands
- Cancelled hatch, no-show ring/dot, selected ring
- Drag/resize hit area (accent is `pointer-events-none`)
- Agenda variant (no accent there — agenda has its own time column)

## QA checklist
- Top of accent tapers to a point that sits inside the card's top-left rounded corner
- Bottom of accent mirrors the same taper into the bottom-left corner
- Middle band is a clean 3.5px stripe with no visible seam where it meets the corner caps
- No overflow past the card's `rounded-[10px]` silhouette at any zoom level
- Works on cards as short as 28px (compact) — middle band collapses gracefully because `top: 10 / bottom: 10` simply meets in the middle (caps may slightly overlap but stay inside the radius)
- Works on tall cards (multi-hour) — middle band stretches, taper geometry unchanged
- Cancelled cards: accent inherits the 60% opacity
- Selected cards: primary ring renders above the accent cleanly
- Blocked / Break cards: no accent (cross overlay reads cleanly)
- Light mode and dark mode: accent color tracks the card's category/status color exactly

## Enhancement suggestion
Once this lands, promote `LeftEdgeAccent` to `src/components/dashboard/schedule/primitives/LeftEdgeAccent.tsx` and add a `radius` prop (defaulting to 10). Then the same primitive can be reused on:
- Drag preview ghosts (same accent, lower opacity)
- AI suggestion ghost cards (dashed accent variant)
- Coverage blocks and break overlays (muted accent)

The radius prop future-proofs it: if the schedule's card radius ever shifts to 12px or 14px, every accent updates from one design token (`tokens.schedule.cardRadiusPx`) instead of hunting through three files.

