

# Make Rose Gold an actual two-tone theme (gold + dusty pink, distinct roles)

## The problem

Right now Rose Gold reads as **one color in different shades** — everything pulls from the same warm pink hue (`18°`/`350°`, both rose-adjacent), so chips, buttons, accents, and backgrounds all look like the same fabric in different lightnesses. That's monochromatic, not duotone.

A real two-tone theme means **two visually distinct colors** showing up side by side in the UI — you should be able to point at a card and say "that piece is gold, that piece is pink." Currently you can't.

## Root cause

Three tokens are doing all the visible "color" work in the dashboard, and right now all three resolve to the same warm pink family:

- `--primary` → rose gold (warm pink)
- `--secondary` → dusty pink (still warm pink, ~30° away)
- `--accent` → rose gold wash (same warm pink)

When `primary`, `secondary`, AND `accent` all sit in the same hue family, the UI has nothing to contrast against itself. To get true duotone you need **two genuinely different hues** mapped to different roles, plus enough saturation that they actually read as different on screen.

## The fix: two real anchor colors with role separation

### Anchor 1 — Champagne Gold (warm metallic yellow-gold)
- **Hue: `38°`** (true champagne gold, not pink)
- Light mode primary: `38 55% 58%` — warm metallic gold
- Dark mode primary: `38 65% 64%` — brighter gold for dark surfaces
- **Role**: Primary CTAs, active nav, KPI accents, pinned/starred states, ring focus

### Anchor 2 — Dusty Rose Pink (cool muted pink)
- **Hue: `345°`** (true dusty rose, pulled cooler so it doesn't blend into the gold)
- Light mode secondary: `345 38% 72%` — visible dusty pink, not a near-white
- Dark mode secondary: `345 32% 58%` — saturated dusty pink for dark surfaces
- **Role**: Secondary buttons, chip backgrounds, hover fills, badges, tags, soft accent surfaces

These two hues sit **~53° apart** on the color wheel — far enough that they read as two distinct colors, close enough that they still feel like one designed family (warm metals + warm florals).

### Role split (the part that was missing)

| Token | Color | What it controls |
|---|---|---|
| `--primary` | **Champagne Gold** | Primary CTA buttons, active state highlights, ring focus, pinned indicators, primary text emphasis |
| `--secondary` | **Dusty Rose Pink** | Secondary buttons, chip fills, badge backgrounds, tag pills, soft surface accents |
| `--accent` | **Dusty Rose Pink (lighter)** | Hover states, accent surface tint, subtle background washes |
| `--ring` | **Champagne Gold** | Focus rings (matches primary) |
| `--muted` | warm neutral | Flat tier (no color identity, just a quiet surface) |
| `--background` | warm cream | Page backdrop with subtle gold undertone |
| `--card` | warmer near-white | Card surfaces lift cleanly above background |
| `--border` | warm hairline | Hairline divider |

The key shift: **`--primary` and `--secondary` use genuinely different hues now**, and `--accent` is anchored to the pink side instead of doubling up on gold. That's what makes the duotone visible — when the UI renders a primary button next to a secondary chip next to an accent surface, you see gold, pink, and pink-wash side by side instead of three near-identical warm-pink shades.

### Light mode palette

| Token | Value | Reads as |
|---|---|---|
| `--background` | `40 30% 97%` | warm cream page (slight gold undertone) |
| `--card` | `40 28% 99%` | near-white with warm tint |
| `--card-inner` | `40 22% 96%` | nested surface |
| `--card-inner-deep` / `--muted` | `40 18% 94%` | flat tier |
| `--popover` | `40 28% 99%` | matches card |
| `--sidebar-background` | `40 22% 96%` | one notch below page |
| `--foreground` | `30 30% 14%` | deep warm brown-black |
| `--muted-foreground` | `30 18% 42%` | muted warm gray |
| `--primary` | `38 55% 58%` | **champagne gold** |
| `--primary-foreground` | `30 30% 12%` | dark text on gold |
| `--secondary` | `345 38% 72%` | **dusty rose pink** (visibly pink, not near-white) |
| `--secondary-foreground` | `30 30% 14%` | dark text on pink |
| `--accent` | `345 30% 88%` | dusty pink wash (hover/soft accent) |
| `--accent-foreground` | `30 30% 14%` | dark text on accent |
| `--border` | `40 20% 88%` | warm hairline |
| `--input` | `40 18% 94%` | field fill |
| `--ring` | `38 55% 58%` | matches gold primary |
| `--destructive` | `0 70% 55%` | unchanged red |

### Dark mode palette

Gold gets brighter/more saturated to retain metallic quality. Pink keeps moderate saturation so it reads as actual pink, not gray.

| Token | Value | Reads as |
|---|---|---|
| `--background` | `30 18% 6%` | warm near-black |
| `--card` | `30 16% 9%` | lifted dark surface |
| `--card-inner` | `30 14% 11%` | nested |
| `--muted` | `30 12% 14%` | flat |
| `--popover` | `30 16% 9%` | matches card |
| `--sidebar-background` | `30 16% 8%` | sidebar surface |
| `--foreground` | `40 25% 95%` | warm cream text |
| `--muted-foreground` | `40 12% 65%` | muted warm gray |
| `--primary` | `38 65% 64%` | **brighter champagne gold** |
| `--primary-foreground` | `30 30% 10%` | dark text on gold |
| `--secondary` | `345 32% 58%` | **dusty rose pink** (dark-mode visible) |
| `--secondary-foreground` | `40 25% 95%` | cream text on pink |
| `--accent` | `345 22% 22%` | dusty pink shadow (subtle dark wash) |
| `--accent-foreground` | `40 25% 95%` | cream text on accent |
| `--border` | `30 14% 18%` | warm hairline |
| `--ring` | `38 65% 64%` | matches gold primary |

## Mesh gradient update

The ambient mesh background (lines 2927 and 3025 in `src/index.css`) needs to use **both** anchor colors so the page feels duotone even at the macro level. Today it's all one warm pink wash. New version:

- Top-left radial: champagne gold (`hsla(38, 55%, 58%, 0.18)` light / `0.22` dark)
- Bottom-right radial: dusty rose pink (`hsla(345, 38%, 72%, 0.18)` light / `0.22` dark)
- Centerpiece: warm cream/near-black base

This gives the page itself a soft gold-to-pink wash that reinforces the duotone identity before any UI renders on top.

## Theme picker swatch

The picker swatch in `src/hooks/useColorTheme.ts` currently shows a single rose-pink swatch. Update to show **both** colors so the duotone is visible at selection time:

- `lightSwatch`: gradient or split swatch — gold (`#C9963F`) → dusty pink (`#D5919E`)
- `darkSwatch`: gold (`#D8A556`) → dusty pink (`#B5717E`)

If swatch infrastructure only supports one color, use the gold (`#C9963F` light / `#D8A556` dark) since that's the primary and will be the most visible accent in the live UI.

## Files touched

| File | Change |
|---|---|
| `src/index.css` | Replace `.theme-orchid` + `.dark.theme-orchid` token blocks with new gold + pink palette. Update mesh gradient blocks (lines ~2927 and ~3025) to use both anchor colors. |
| `src/hooks/useColorTheme.ts` | Update Rose Gold theme metadata: swatch hex values, description ("Champagne gold & dusty rose"). |
| `src/components/dashboard/settings/EmailBrandingSettings.tsx` | Update `THEME_ACCENT_DEFAULTS['orchid']` hex to new gold (`#C9963F`). |

CSS class key stays `.theme-orchid` — same migration-safe approach as before.

## Acceptance

1. Selecting Rose Gold renders **two visibly different colors** in the live dashboard at the same time:
   - Primary CTAs read as **warm metallic gold**.
   - Secondary chips, badges, and hover fills read as **dusty rose pink**.
2. You can point at any analytics card and identify the gold pieces vs the pink pieces — they don't all blur together as "warm pink shades."
3. The mesh background gradient shows both colors (gold corner + pink corner) instead of one uniform wash.
4. The theme picker swatch shows both colors (or at minimum the gold, since it's primary and most visible).
5. Light and dark modes both maintain the duotone — pink doesn't disappear into gray on dark, gold doesn't wash out to beige on light.
6. Cards still lift cleanly above background (97%/99% lightness ladder preserved).
7. WCAG AA text contrast passes on all primary, secondary, and accent surfaces.
8. No other theme is touched.

## Out of scope

- Changing which UI roles map to which token (Tailwind's `bg-secondary`, `bg-accent`, `bg-primary` semantics stay as-is — we're only changing what colors those tokens resolve to).
- Renaming the CSS class from `.theme-orchid`.
- Adding a third accent color.
- Touching mesh gradients or palettes for any other theme.

## Prompt feedback

This was a sharp, surgical correction — three things you did right:

1. **You named the failure mode precisely.** "Monochromatic" is the exact technical word for what was wrong, and using it told me immediately the issue is hue diversity, not lightness or saturation.
2. **You restated the original intent in different words.** "Some components are gold and some are pink" is a totally different framing from "duotone theme" — the second framing made it concrete (two colors visible side by side in the UI) instead of abstract (a design concept).
3. **You caught the regression on the live preview.** Rather than accepting the previous output, you tested it visually and reported back. That's exactly the right loop for design work.

Sharpener: when correcting a color/visual regression, calling out **a specific UI element** that should differ would tighten the fix. Template:

```text
[Theme] is [wrong attribute] — should be [right attribute].
For example, [specific component A] should be [color X], 
and [specific component B] should be [color Y].
```

Example:
```text
Rose Gold is monochromatic — should be true two-tone.
For example, primary CTA buttons should be metallic gold, 
and chip backgrounds / badges should be dusty pink.
```

The **"for example, [component] should be [color]"** clause is the underused construct on color-correction prompts. It removes the last layer of interpretation — without it I have to guess which UI roles get which color (and I might invert them, e.g., putting pink on the primary CTA, which would feel washed out and lose the metallic luxury cue you're after).

