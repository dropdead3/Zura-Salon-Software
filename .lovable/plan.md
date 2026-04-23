

## Prompt feedback
Strong: "that does not look good" + a screenshot is direct and the screenshot makes the failure obvious. Even better next time: name the specific visual symptom — e.g. *"the corners look like floating bracket marks instead of a continuous frame"*. That tells me which dimension of "bad" you mean (positioning vs color vs weight vs continuity), and prevents me from guessing wrong.

## Root cause
The current "corner frame" is built from **3 stacked DOM elements** (full-radius bordered box + two straight vertical stubs). The stubs are pure rectangles pinned to `top-0 left-0` / `top-0 right-0` — they sit *outside* the card's rounded corner, so they read as disconnected bracket marks (`⌐ ¬`) rather than a stroke that wraps the radius. The full-radius bordered box behind them does follow the corner, but its top stroke meets the straight stubs at an angle, amplifying the broken look.

## Fix — single SVG accent that actually traces the curve

Replace the 3-element hack with **one inline SVG** rendered absolutely inside the card. The SVG draws a single continuous path that:
1. Starts ~14px down the left edge
2. Curves around the top-left corner (10px radius — exactly matches `rounded-[10px]`)
3. Runs across the top edge
4. Curves around the top-right corner
5. Ends ~14px down the right edge

Because it's one continuous `<path>` with `stroke-linecap="round"` and the same radius as the card, the accent reads as a single wrap, never as bracket fragments.

### Implementation
File: `src/components/dashboard/schedule/AppointmentCardContent.tsx`

Replace lines 134-158 (category-color block) and lines 715-730 (status-color block) with a single shared component placed inline:

```jsx
{/* Continuous corner-wrap accent — single SVG path traces top + partial sides */}
<svg
  className="absolute inset-0 w-full h-full pointer-events-none z-[3] overflow-visible"
  preserveAspectRatio="none"
  viewBox="0 0 100 100"
>
  <path
    d="M 0,14 L 0,10 Q 0,0 10,0 L 90,0 Q 100,0 100,10 L 100,14"
    fill="none"
    stroke={accentColor}
    strokeWidth="1.5"
    strokeLinecap="round"
    vectorEffect="non-scaling-stroke"
    style={{ opacity: 0.75 }}
  />
</svg>
```

Key details:
- `viewBox="0 0 100 100"` + `preserveAspectRatio="none"` lets the path scale to any card width without distorting the corner radius (because `vectorEffect="non-scaling-stroke"` keeps the stroke a true 1.5px regardless of scale, and we draw the corners with absolute pixel-equivalent units that match the card's `rounded-[10px]`).
- Wait — `non-scaling-stroke` keeps stroke width constant but corner radii in the path *would* distort. The cleaner approach: render the SVG at the card's actual pixel size by **omitting `viewBox`** entirely and using absolute coordinates that match the parent's box.

### Cleaner final approach (recommended)
Use a `<svg>` sized to match the card and draw with absolute coordinates:

```jsx
<svg
  className="absolute inset-0 w-full h-full pointer-events-none z-[3]"
  fill="none"
>
  <path
    d="M 0.75,14 L 0.75,10 Q 0.75,0.75 10,0.75 L calc(100% - 10px),0.75 ..."
  />
</svg>
```

Since SVG `<path>` doesn't accept `calc()`, use a `<rect>` with `pathLength` tricks **or** render via a CSS-only solution instead.

### Best approach — CSS `mask-image` on a bordered box

Single element. Reliable across all card sizes. No SVG sizing math.

```jsx
<div
  className="absolute inset-0 pointer-events-none z-[3] rounded-[10px]"
  style={{
    border: '1.5px solid var(--accent-color)',
    opacity: 0.75,
    WebkitMaskImage: 'linear-gradient(to bottom, black 0px, black 14px, transparent 14px)',
    maskImage: 'linear-gradient(to bottom, black 0px, black 14px, transparent 14px)',
  }}
/>
```

How it works:
- A normal `rounded-[10px]` border drawn around the entire card (so it perfectly traces both top corners with the exact same radius as the card).
- A linear-gradient mask reveals only the **top 14px** of that bordered box, then hard-cuts to transparent. Below 14px, the border is invisible.
- Result: the visible portion = top edge + corner curves + ~14px down each side. One continuous stroke. No bracket marks. No alignment issues.

### Apply to both code paths
- **Category-color cards** (lines 134–158): use `var(--accent-color)` set inline to `catColor.text`, opacity 0.75.
- **Status-color cards** (lines 715–730): same element, color sourced from `statusColors.text` resolved to a real CSS color (use `currentColor` if the parent already sets `color`).

### Tuning
- Wrap depth: keep `14px`
- Stroke weight: `1.5px`
- Opacity: `0.75` for category, `1.0` for status (status colors are already muted)
- Corner radius: `rounded-[10px]` (matches card exactly)

## What stays the same
- Card radius, shadow stack, hover lift, sheen overlay, lit-edge inner ring
- 1px overlap gap math in `schedule-utils.ts`
- All status pills, NC/RC chips, stylist avatars, multi-service bands
- Cancelled hatch, no-show ring/dot, selected glow

## QA
- Top of card shows a single continuous stroke wrapping both rounded corners and extending ~14px down each side
- No floating bracket marks, no stubs sticking out past the corner radius
- Bottom of card has no accent (mask cuts cleanly at 14px)
- Stroke is visually identical on category-color cards and status-color cards
- 1px overlap gap between adjacent cards is preserved
- Selected ring, no-show dot, and cancelled hatch all still render correctly

## Enhancement suggestion
Once this lands cleanly, promote it to a `<CardCornerAccent color={...} wrapDepth={14} />` primitive in `src/components/dashboard/schedule/`. Then the same accent can be reused on drag previews, coverage blocks, AI suggestion ghosts, and break overlays — and `wrapDepth` becomes a single design token (`tokens.schedule.cornerWrapPx`) instead of a magic number.

