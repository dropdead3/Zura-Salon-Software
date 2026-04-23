

# Dark-mode hover fill — lighter surface + primary tint

Right now `.hover-lift:hover` only changes `box-shadow` + `border-color`. The card's **fill** doesn't change, so in dark mode hovering a card just adds a drop shadow — the surface itself reads as inert. We want the fill to come up a notch and pick up a whisper of primary.

## The fix

Extend `.hover-lift:hover` (scoped to `.dark` only — light mode stays as-is) so the card fill brightens slightly and gains a primary-tinted overlay.

### File: `src/index.css` (around line 1702)

Add a dark-mode-specific rule right after the existing `.hover-lift:hover` block:

```css
.hover-lift:hover {
  box-shadow: var(--elevation-2);
  border-color: hsl(var(--primary) / 0.3);
}

/* Dark mode only: fill comes up ~3% and picks up a whisper of primary.
   Layered gradient = flat lighten + primary wash, composited over bg-card. */
.dark .hover-lift:hover {
  background-image:
    linear-gradient(hsl(var(--primary) / 0.04), hsl(var(--primary) / 0.04)),
    linear-gradient(hsl(var(--foreground) / 0.03), hsl(var(--foreground) / 0.03));
  transition: box-shadow 220ms cubic-bezier(0.32, 0.72, 0, 1),
              border-color 220ms cubic-bezier(0.32, 0.72, 0, 1),
              background-image 220ms cubic-bezier(0.32, 0.72, 0, 1);
}
```

### Why this shape

- **`background-image` over `background-color`** — every `.hover-lift` consumer already sets `bg-card` (or `premium-surface` which sets `background-color` directly). Overriding `background-color` on hover would either fight Tailwind specificity or erase `premium-surface`'s translucent base. Stacking a pair of linear gradients composites cleanly on top of whatever base the card brings.
- **Two stacked gradients** — the `foreground/3%` layer is the "lighter fill" (neutral lift), the `primary/4%` layer is the theme wash. Stacked they read as a warm, subtly branded hover, not a flat color swap.
- **Dark-only (`.dark .hover-lift:hover`)** — light mode's fill already shifts perceptibly from the shadow + border tint; adding a wash there would muddy it. The problem is specifically dark-mode inertness.
- **`transition` repeated** — needed so `background-image` animates in, not snaps.

### Values tuned for calm

- `foreground/3%` lift: barely perceptible in isolation, but enough to separate the hovered card from its siblings.
- `primary/4%` tint: lower than the `primary/30%` border tint so the fill reads as "theme present," not "theme loud."
- Combined effect on a `bg-card` dark surface (~11% L): card fills brighten to roughly ~14% L with a violet undertone. Reads premium, not gamer.

## Acceptance

1. In dark mode, hovering any dashboard card (Operations Hub, Settings, Analytics KPIs, etc.) brightens its fill slightly and overlays a whisper of primary (violet).
2. Light mode hover is unchanged — still just shadow + border tint.
3. The transition animates in/out over 220ms; no snap, no flash.
4. `premium-surface` cards (glass tier) keep their frosted base — the hover wash sits *on top* of the translucent card, not replacing it.
5. Reduced-motion users (existing `.hover-lift` override at line 1830) still get instant hover, no animation.

## Out of scope

- Light-mode hover fill adjustment (looks correct today).
- Touching `premium-card` glow, `.card-glow`, or any other non-`hover-lift` hover classes.
- Per-theme tinting beyond what `--primary` already resolves to (Zura/Cream/Rose/Sage/Ocean/Ember/Noir themes inherit automatically).
- The `PlatformCard` hover in `platform-card-hover` — that's a separate utility for platform-side surfaces and intentionally distinct.

