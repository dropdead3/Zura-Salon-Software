

# Marine theme: richer, more vibrant blue (premium SaaS feel)

## Diagnosis

Per the screenshot, the **Marine** swatches read as muted slate/denim — the primary tile is a soft, desaturated mid-blue that feels like Office 365 chrome rather than a confident SaaS accent (Linear, Vercel, Stripe, Notion).

Current `.theme-marine` tokens in `src/index.css`:

| Token | Value | Read |
|---|---|---|
| `--primary` (light) | `218 65% 35%` | dark navy, low vibrance |
| `--primary` (dark) | `218 70% 60%` | muted denim — exactly what you flagged |

The hue (218°) is fine — it's solidly in the "trusted blue" family. The issue is **saturation and lightness**: not punchy enough on the accent, and the dark-mode primary sits at a flat lightness that reads grayish against the dark surface.

## What changes

### Single concept

Keep the navy *background identity* (deep, executive, premium) but make the **accent blue** richer and more vibrant — closer to the saturated electric blue used by premium SaaS (Linear's blue, Stripe's `#635BFF`-adjacent, Vercel's accent). Hue stays around 218–222°, saturation jumps from 65–70% → 88–92%, lightness lifts on the accent so it pops against both light and dark surfaces.

### Token shifts in `src/index.css`

**Light mode — `.theme-marine`:**

| Token | Before | After |
|---|---|---|
| `--primary` | `218 65% 35%` | `220 90% 52%` (vibrant electric blue) |
| `--ring` | `218 65% 35%` | `220 90% 52%` |
| `--sidebar-primary` | `218 65% 35%` | `220 90% 52%` |
| `--accent` | (current) | shift toward same family at lower lightness |
| `--chart-1` | (current navy) | `220 90% 52%` |
| `--chart-2` | (current) | `200 85% 50%` (cyan-leaning, complementary pop) |
| `--chart-4` | (gold, kept) | unchanged — gold accent is the differentiator |

Backgrounds stay in the cool-navy family (slight tint, mostly white surfaces) — the *vibrance* lives on the accent, not the chrome.

**Dark mode — `.dark.theme-marine`:**

| Token | Before | After |
|---|---|---|
| `--primary` | `218 70% 60%` | `220 92% 62%` (saturated, punchy) |
| `--chart-1` | (current) | `220 92% 62%` |
| `--chart-2` | (current) | `200 88% 60%` |
| `--background` / `--card` | (deep navy, kept) | unchanged — the dark navy chrome is what makes the accent pop |

The dark mode background stays the deep navy it already is — that's the "Bloomberg terminal" identity. Only the accent and chart colors get the saturation lift.

### Swatch preview update in `src/hooks/useColorTheme.ts`

Update the `marine` entry's `lightPreview.primary` and `darkPreview.primary` to the new vibrant blue (`hsl(220 90% 52%)` / `hsl(220 92% 62%)`) so the swatch tile in the Appearance grid actually previews the punchy accent the user will see in the dashboard. Description stays "Deep navy & gold" — still accurate (navy chrome + gold chart accent), the change is purely how confident the blue accent is.

### Terminal splash palette update in `src/lib/terminal-splash-palettes.ts`

Update `marine` accent from current denim to the new vibrant blue: accent `#2f6fed`, glow `#1f5acc`, RGB `(47, 111, 237)`. Gradient stops stay deep navy.

## Acceptance

1. Marine swatch tile on the Appearance grid reads as a confident, vibrant SaaS blue — not muted slate.
2. Selecting Marine paints sidebar active state, primary buttons, focus rings, and chart-1 series in the new vibrant blue (light + dark mode).
3. Background chrome stays in the deep-navy family — only the *accent* gets richer.
4. Gold chart-4 accent stays — that's the executive differentiator.
5. No other theme is affected.
6. Existing orgs already on Marine automatically render the richer palette on next load (same theme key).
7. Terminal splash for Marine reflects the vibrant blue.

## What stays untouched

- Marine's hue family (still ~218–220°, still "trusted blue").
- Marine's gold chart-4 accent — the executive identity stays.
- All other 7 themes.
- Theme picker chrome, swatch tile layout, count, order.
- Migration logic, God Mode bar, scroll-to-top, glass morphism.

## Out of scope

- Renaming Marine. Defer — name still fits.
- Adding a second blue theme (e.g., "Sapphire" jewel-tone). Defer — Marine occupies the blue slot; one is enough.
- Touching the dark-mode background lightness. The deep navy chrome is what makes the new accent pop.

## Doctrine alignment

- **Calm executive UX:** richer blue ≠ louder blue. Saturation lifts on the *accent only* (sidebar active, primary button, focus ring, chart-1) while chrome stays deep. The bar of color goes up; the noise floor stays flat.
- **Brand abstraction:** "vibrant blue" is still in the same evocative-neutral register — no tenant reference introduced.

## Prompt feedback

Strong prompt — three things you did right:

1. **You named the target feel with two reference points ("premium SaaS").** That's a tight cluster (Linear, Vercel, Stripe, Notion) with a recognizable accent-blue convention — gave me a clear visual target.
2. **You named what to move *away* from ("muted Microsoft Word").** Negative anchors are as useful as positive ones — they ruled out the "dark navy + soft accent" direction the current tokens were heading.
3. **You named the dimensions ("richer, more vibrant").** Two synonyms pointing at the same axis (saturation + lightness) — confirmed the fix is in saturation, not hue.

Sharpener: when shifting a color along a feel-axis, naming the **chrome vs accent split** removes a decision. Template:

```text
Surface: [theme/component]
Direction: [richer / softer / warmer / cooler]
Reference: [the visual cluster you want to land near]
Chrome behavior: [keep / shift with accent]
Accent behavior: [keep / shift]
```

Here, "make the accent more vibrant but keep the navy chrome" would have skipped my having to derive that the deep-navy background is the *anchor* of the theme's identity, and only the accent should change. I inferred it from the "premium SaaS" reference (those products all use deep neutrals + saturated accents, not saturated everywhere) — but you naming the chrome/accent split would have anchored me directly.

## Further enhancement suggestion

For "shift a theme along a feel-axis" prompts, the highest-leverage frame is:

```text
Surface: [the theme]
Current feel: [what it reads as today]
Target feel: [what it should read as]
Reference cluster: [3+ products in that aesthetic]
Boundary: [what should NOT change — chrome / hue family / a specific accent]
```

The **Boundary** slot is the highest-leverage addition for theme refinement — it forces the framing "shift X but protect Y." Without it, "make the blue more vibrant" can over-correct into "saturate everything" and lose the executive identity. Naming the boundary ("keep the deep navy chrome," "keep the gold accent," "keep the dark mode background") preserves what's already working while you sharpen what isn't. For color shifts specifically, the boundary almost always lives on the *chrome layer* — backgrounds, borders, surface tints — because that's what carries the theme's *identity*. The accent layer is what carries the theme's *energy*. Naming which layer to move and which to protect is the fastest path to a sharper result without regression.

