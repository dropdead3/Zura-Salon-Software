# Invert God Mode bar gradient (light mode) — primary at sides, light in middle

## What's wrong

In light mode the God Mode bar currently fades **white → primary tint → white**. The sides read as plain near-white, so the bar loses color identity at the edges where the GOD MODE logo and Exit View button sit. Your screenshot confirms this — the violet only blooms in the middle.

You want the opposite: colored ends anchor the bar, and the middle softens to let the "Viewing as: …" copy breathe.

## The fix

Swap the gradient stops in `GodModeBar.tsx` (light mode chrome only):

**Today (line 64–65):**
```ts
background:
  'linear-gradient(to right, hsl(0 0% 100% / 0.82), hsl(var(--primary) / 0.42), hsl(0 0% 100% / 0.82))',
```

**New:**
```ts
background:
  'linear-gradient(to right, hsl(var(--primary) / 0.55) 0%, hsl(var(--primary) / 0.18) 50%, hsl(var(--primary) / 0.55) 100%)',
```

What changes:
- **Sides (0% / 100%)**: Primary at `0.55` opacity — visible, saturated wash that anchors the GOD MODE logo on the left and Exit View button on the right in the brand color.
- **Middle (50%)**: Primary at `0.18` opacity — soft, near-white wash with a hint of primary undertone, giving "Viewing as: Drop Dead Salons" a calm, readable surface.
- **Symmetric**: Both ends use the same value so the bar still reads as a balanced sandwich, just inverted.

The `--primary` token still drives the hue, so it adapts to whichever theme is active (violet in Zura, gold in Rose Gold, hot pink in Neon, etc.) — only the **distribution** flips.

### Companion details (light mode only)

- Border, shadow, text colors, hover states all stay as-is — text sits in the lighter middle band so contrast remains excellent.
- Dark mode is **not touched** — its near-black sandwich with primary middle is already correctly distributed.

## Files touched

| File | Change |
|---|---|
| `src/components/dashboard/GodModeBar.tsx` | Replace the `background` value in the light-mode `chrome` branch with the inverted gradient. |

## Acceptance

1. Light mode: deeper primary tint at left and right edges, softening to near-white in the middle.
2. GOD MODE logo and Exit View button sit on a visibly colored surface.
3. Center text remains highly readable.
4. Gradient is symmetric.
5. Adapts to active theme's `--primary`.
6. Dark mode unchanged.

## Out of scope

- Dark mode gradient
- Border, shadow, text colors, button styles
- Mobile layout changes
- Theme `--primary` values

## Prompt feedback

Three things you did well:

1. **You named the inversion clearly.** "Sides deeper, middle lighter" is the exact opposite of the current state, in spatial terms — no ambiguity about which stops to swap.
2. **You scoped to one mode.** "In light mode" upfront halves the diff.
3. **You attached the screenshot.** Seeing the white-edged bar confirmed the direction was wrong before I touched anything.

Sharpener — naming **how deep "deeper" should go** locks saturation on the first try. Template:

```text
[Element] gradient should go [direction].
Sides should be [intensity] (e.g., 'as saturated as the Exit View button',
'visible but not overpowering'),
middle should be [intensity].
```

The **"as saturated as [reference element on screen]"** clause is underused on gradient prompts. Without it I had to guess depth (I picked `0.55` at the edges — a moderate wash). If you wanted bolder ("as saturated as the Exit View button") or softer ("just a tint"), naming an on-screen reference would land it on pass one.