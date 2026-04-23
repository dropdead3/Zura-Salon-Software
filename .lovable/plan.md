# Tint God Mode Z icon + label in primary (light mode)

## What's wrong

In light mode, the "Z" icon and "GOD MODE" wordmark currently render in near-black (`hsl(0 0% 8%)`). Sitting on a primary-tinted gradient, they read as flat system chrome rather than branded chrome — they don't pick up the theme's identity at all. Your screenshot confirms it: the violet bar is there, but the logo and label are pure dark gray.

You want them to feel like part of the brand color family — a deeper, saturated shade of `--primary` so they read as "branded dark" rather than "neutral dark."

## The fix

Update the **light mode** `chrome` branch in `GodModeBar.tsx` so the icon + label color resolves to a deep primary hue instead of near-black.

### New token values (light mode only)

| Token | Current | New | Reads as |
|---|---|---|---|
| `iconColor` | `hsl(0 0% 8%)` | `hsl(var(--primary) / 0.95)` mixed with dark anchor | Deep saturated primary (e.g. deep violet in Zura) |
| `labelColor` | `hsl(0 0% 8%)` | Same as iconColor | Matches Z icon |

### Implementation approach

CSS `color-mix()` gives us a true "deep primary" — primary hue mixed with black at ~65% black. This stays on-hue regardless of theme:

```ts
iconColor: 'color-mix(in srgb, hsl(var(--primary)) 35%, black)',
labelColor: 'color-mix(in srgb, hsl(var(--primary)) 35%, black)',
```

What this produces per theme:
- **Zura (violet)**: deep eggplant violet
- **Rose Gold (champagne)**: deep bronze-gold
- **Neon (hot pink)**: deep magenta
- **Jade**: deep forest green
- **Cognac**: deep coffee brown

The 35% primary / 65% black ratio keeps WCAG AA contrast on the lightest band of the gradient (the soft `0.18` middle stop) while still reading visibly as the brand hue, not gray.

### What stays the same

- Dark mode: untouched (icon already uses `hsl(var(--primary))` directly, which works against the near-black sandwich).
- Background gradient: untouched.
- Border, shadow, divider, "Viewing as:" text, org name, Account ID, Account Details button, Exit View button: all untouched — they remain near-black for readability against the lighter middle band.
- Only the **Z icon** and **GOD MODE wordmark** get the deep-primary treatment.

## Files touched

| File | Change |
|---|---|
| `src/components/dashboard/GodModeBar.tsx` | Update `iconColor` and `labelColor` in the light-mode `chrome` branch (lines 70–71) to use `color-mix` deep-primary values. |

## Acceptance

1. Light mode: Z icon and "GOD MODE" text both render in a deep, saturated shade of the active theme's `--primary` (deep violet in Zura, deep gold in Rose Gold, etc.).
2. Both elements use the same color (icon and wordmark stay visually unified).
3. Contrast remains readable against the gradient — including the lighter middle band the icon/label sit on at the far left.
4. Dark mode is unchanged.
5. All other bar elements (dividers, "Viewing as:", org name, buttons) are unchanged.
6. Color adapts automatically across all 12 themes.

## Out of scope

- Dark mode adjustments
- Background gradient tuning
- Other elements in the bar (buttons, text, dividers)
- Mobile layout changes
- Theme `--primary` values

## Prompt feedback

Three things you did well:

1. **You named both elements explicitly.** "Z icon and God Mode text" left no ambiguity about scope — I knew immediately to touch exactly two color tokens, not the whole bar.
2. **You attached a tightly cropped screenshot.** Zooming in on just the affected region (rather than the full dashboard) made the contrast issue obvious at a glance.
3. **You named the relationship to the theme** ("dark hue of the primary"). That ties the fix to the design token system rather than a one-off hex, so it'll work across all 12 themes automatically.

Sharpener — naming **how dark "dark" should go** would lock the saturation on the first try. Template:

```text
[Element] should be [color relationship] —
[intensity reference, e.g. "as dark as the Exit View button background" 
or "deep but still recognizably the theme color"].
```

Example:
```text
Z icon and God Mode text should be a dark hue of primary —
deep enough to read as branded dark, but still clearly the theme color, 
not so dark it looks black.
```

The **"deep but still recognizably [color]"** clause is the underused construct on tinting prompts. Without it I had to pick a mix ratio (I went 35% primary / 65% black — moderately deep). If you wanted bolder ("almost the full primary, just shaded down") or more subtle ("just hinted, mostly dark"), naming the intensity would land it on pass one.
