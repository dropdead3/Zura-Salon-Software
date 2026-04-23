

# 3 new premium themes: **Matrix**, **Peach**, **Prism**

## Diagnosis

Current palette covers 9 themes. Gaps the request fills:

| Request | Maps to | Differentiates from |
|---|---|---|
| Neon green + dark navy | **Matrix** — cyberpunk terminal jewel-green on navy chrome | Sage (soft mint), Jade (teal), Marine (blue chrome but blue accent) |
| Peach | **Peach** — warm coral-peach on cream | Cognac (amber/brown), Rosewood (deep rose), Neon (hot magenta) |
| Multi-color rainbow | **Prism** — iridescent gradient primary with full chart spectrum | All — first non-monochromatic theme |

## Theme 1: **Matrix** — neon jewel-green on deep navy

### Single concept

Bloomberg/terminal/Tron register: **electric jewel-green accent (hue 145°, saturation 90%, luminous)** sitting on a **deep navy chrome (hue 220°, near-black)**. Reads as command-center, not pastel. The navy chrome is the differentiator from Sage (which has off-white/mint chrome).

### Light mode `.theme-matrix` core tokens

| Token | Value |
|---|---|
| `--background` | `220 30% 96%` (cool blue-tinted off-white) |
| `--card` | `220 25% 98%` |
| `--primary` | `145 75% 32%` (deep emerald — readable on white) |
| `--primary-foreground` | `0 0% 100%` |
| `--secondary` | `220 20% 88%` |
| `--muted` | `220 15% 90%` |
| `--muted-foreground` | `220 25% 30%` |
| `--accent` | `145 35% 88%` |
| `--gold` | `42 75% 45%` |
| `--chart-1` | `145 75% 32%` |
| `--chart-2` | `220 70% 40%` (deep navy contrast) |
| `--chart-3` | `175 60% 38%` (teal bridge) |
| `--chart-4` | `42 75% 45%` (gold) |
| `--chart-5` | `280 55% 50%` (violet tertiary) |
| `--border` | `220 15% 82%` |
| `--ring` | `145 75% 32%` |
| `--sidebar-background` | `220 25% 92%` |
| `--sidebar-primary` | `145 75% 32%` |

### Dark mode `.dark.theme-matrix` core tokens

| Token | Value |
|---|---|
| `--background` | `220 50% 5%` (rich deep navy — visibly blue, not gray) |
| `--card` | `220 45% 9%` |
| `--popover` | `220 45% 9%` |
| `--primary` | `145 90% 50%` (luminous neon green — Tron register) |
| `--primary-foreground` | `220 50% 5%` (dark navy on green button) |
| `--secondary` | `220 35% 14%` |
| `--muted` | `220 30% 16%` |
| `--muted-foreground` | `220 20% 65%` |
| `--accent` | `145 40% 14%` (subtle green-tinted hover) |
| `--gold` | `42 80% 55%` |
| `--chart-1` | `145 90% 55%` (luminous green) |
| `--chart-2` | `200 85% 60%` (cyan complement) |
| `--chart-3` | `175 70% 50%` (teal) |
| `--chart-4` | `42 80% 55%` (gold) |
| `--chart-5` | `280 70% 65%` (violet) |
| `--border` | `220 30% 16%` |
| `--input` | `220 30% 14%` |
| `--ring` | `145 90% 50%` |
| `--sidebar-background` | `220 50% 4%` |
| `--sidebar-primary` | `145 90% 50%` |
| `--sidebar-accent` | `220 35% 12%` |
| `--card-inner` | `220 40% 7%` |

### Terminal splash palette

```ts
matrix: palette(
  ['#020814', '#04142a', '#020814'],
  '#1aff7a',   // luminous neon green
  '#0fcc60',   // deeper glow
  26, 255, 122,
),
```

---

## Theme 2: **Peach** — warm coral peach on cream

### Single concept

**Soft warm coral-peach (hue 18°, mid saturation)** on a warm cream chrome — sunset/creamsicle/peony register. Differentiates from Cognac (amber-brown, hue 28°, leather feel) by sitting in the **pink-orange band** (closer to Rosewood's hue family but lighter, brighter, more playful — a "sorbet" not a "deep rose").

### Light mode `.theme-peach` core tokens

| Token | Value |
|---|---|
| `--background` | `25 50% 96%` (warm cream-peach wash) |
| `--card` | `25 40% 98%` |
| `--primary` | `18 75% 58%` (luminous coral peach) |
| `--primary-foreground` | `0 0% 100%` |
| `--secondary` | `22 35% 88%` |
| `--muted` | `22 25% 90%` |
| `--muted-foreground` | `18 25% 35%` |
| `--accent` | `18 50% 88%` |
| `--gold` | `42 75% 45%` |
| `--chart-1` | `18 75% 58%` |
| `--chart-2` | `8 70% 62%` (warmer coral-red) |
| `--chart-3` | `35 70% 58%` (peach-orange bridge) |
| `--chart-4` | `42 75% 50%` (gold) |
| `--chart-5` | `340 60% 60%` (rose contrast) |
| `--border` | `22 25% 82%` |
| `--ring` | `18 75% 58%` |
| `--sidebar-background` | `25 40% 93%` |
| `--sidebar-primary` | `18 75% 58%` |

### Dark mode `.dark.theme-peach` core tokens

| Token | Value |
|---|---|
| `--background` | `18 25% 6%` (warm dark-peach chrome) |
| `--card` | `18 22% 11%` |
| `--primary` | `18 85% 65%` (luminous peach pops on dark) |
| `--primary-foreground` | `18 25% 6%` |
| `--secondary` | `18 18% 16%` |
| `--muted` | `18 15% 18%` |
| `--muted-foreground` | `25 20% 65%` |
| `--accent` | `18 22% 16%` |
| `--gold` | `42 80% 55%` |
| `--chart-1` | `18 85% 65%` |
| `--chart-2` | `8 75% 65%` |
| `--chart-3` | `35 75% 60%` |
| `--chart-4` | `42 80% 55%` |
| `--chart-5` | `340 65% 65%` |
| `--border` | `18 18% 18%` |
| `--input` | `18 18% 16%` |
| `--ring` | `18 85% 65%` |
| `--sidebar-background` | `18 25% 5%` |
| `--card-inner` | `18 22% 9%` |

### Terminal splash palette

```ts
peach: palette(
  ['#1a0a08', '#3d1810', '#1a0a08'],
  '#ff8a5c',   // luminous coral peach
  '#e6754a',   // deeper glow
  255, 138, 92,
),
```

---

## Theme 3: **Prism** — iridescent multi-color spectrum

### Single concept

The first **non-monochromatic theme**. Primary surfaces use a **violet-magenta-cyan iridescent register** (Apple WWDC / Stripe / Linear iridescent register). Chart series uses the **full spectrum** (5 distinct vibrant hues), making Prism the natural choice for users who want their dashboards to feel like a creative-tool aesthetic rather than executive minimal.

Primary accent picks the **magenta-violet midpoint** (hue 290°, high saturation) as the "anchor" hue — chosen because it's the perceptual center of a rainbow gradient and unrelated to Zura's brand violet (270°) or Neon's hot pink (330°). The full spectrum lives in the chart palette.

### Light mode `.theme-prism` core tokens

| Token | Value |
|---|---|
| `--background` | `280 30% 97%` (cool iridescent off-white) |
| `--card` | `280 25% 98%` |
| `--primary` | `290 75% 55%` (vibrant magenta-violet anchor) |
| `--primary-foreground` | `0 0% 100%` |
| `--secondary` | `280 25% 90%` |
| `--muted` | `280 18% 92%` |
| `--muted-foreground` | `280 20% 35%` |
| `--accent` | `200 60% 90%` (cyan-shimmer hover — cross-spectrum hint) |
| `--gold` | `42 75% 45%` |
| `--chart-1` | `290 75% 55%` (magenta) |
| `--chart-2` | `200 80% 50%` (cyan) |
| `--chart-3` | `145 65% 45%` (green) |
| `--chart-4` | `42 90% 55%` (sun yellow) |
| `--chart-5` | `15 85% 58%` (coral red) |
| `--border` | `280 20% 85%` |
| `--ring` | `290 75% 55%` |
| `--sidebar-background` | `280 25% 94%` |
| `--sidebar-primary` | `290 75% 55%` |

### Dark mode `.dark.theme-prism` core tokens

| Token | Value |
|---|---|
| `--background` | `265 35% 5%` (deep iridescent indigo-black) |
| `--card` | `270 30% 10%` |
| `--primary` | `290 90% 65%` (luminous magenta) |
| `--primary-foreground` | `265 35% 5%` |
| `--secondary` | `270 25% 16%` |
| `--muted` | `270 22% 18%` |
| `--muted-foreground` | `280 18% 65%` |
| `--accent` | `200 50% 16%` (cyan-tinted hover) |
| `--gold` | `42 85% 60%` |
| `--chart-1` | `290 90% 65%` (magenta) |
| `--chart-2` | `200 90% 60%` (cyan) |
| `--chart-3` | `145 75% 55%` (green) |
| `--chart-4` | `48 95% 60%` (yellow) |
| `--chart-5` | `15 90% 62%` (coral) |
| `--border` | `270 22% 18%` |
| `--input` | `270 22% 16%` |
| `--ring` | `290 90% 65%` |
| `--sidebar-background` | `265 35% 4%` |
| `--sidebar-primary` | `290 90% 65%` |
| `--card-inner` | `270 28% 8%` |

### Terminal splash palette

```ts
prism: palette(
  ['#0a0414', '#1a0833', '#0a0414'],
  '#c43eff',   // luminous magenta anchor
  '#9d2adb',   // deeper glow
  196, 62, 255,
),
```

> Note on Prism: the splash uses the magenta anchor color (single-hue glow) rather than a literal rainbow gradient. A multi-stop rainbow splash on a 1080×1920 terminal screen would read as carnival/childish, not premium. The "rainbow" lives in the **dashboard chart series** where it earns its keep, not in the lock-screen chrome.

---

## Files modified (all three themes)

### 1. `src/hooks/useColorTheme.ts`
- Add `'matrix'`, `'peach'`, `'prism'` to `ColorTheme` union
- Append to `ALL_THEMES` array (ordering: matrix → peach → prism, after `neon`)
- Add to `COLOR_THEME_TO_CATEGORY_MAP`:
  - `matrix: 'Herb Garden'` (closest green category)
  - `peach: 'Sunset Bloom'`
  - `prism: 'Lavender Fields'`
- Append three entries to `colorThemes` array with HSL preview values matching the primary/bg/accent tokens above

### 2. `src/index.css`
- Append three pairs of blocks at end of `@layer base`: `.theme-matrix` + `.dark.theme-matrix`, `.theme-peach` + `.dark.theme-peach`, `.theme-prism` + `.dark.theme-prism`
- Each block mirrors `.theme-jade` structure for token completeness (all `--success`, `--warning`, `--destructive`, `--oat`, `--card-inner`, `--card-inner-deep`, full sidebar block)

### 3. `src/lib/terminal-splash-palettes.ts`
- Add `matrix`, `peach`, `prism` palette entries

### 4. `src/components/dashboard/settings/EmailBrandingSettings.tsx`
- Add `matrix: '#1AFF7A'`, `peach: '#FF8A5C'`, `prism: '#C43EFF'` to email branding accent map

## Acceptance

1. Three new swatches appear in theme picker as positions 10, 11, 12.
2. **Matrix** reads as command-center cyberpunk — luminous green on deep navy. Distinctly different from Sage (soft mint pastel) and Jade (teal jewel).
3. **Peach** reads as warm sorbet/sunset coral. Distinctly different from Cognac (brown amber), Rosewood (deep rose), and Neon (hot magenta).
4. **Prism** reads as iridescent creative-tool — magenta primary with full rainbow chart spectrum. Distinctly different from all monochromatic themes.
5. Light + dark mode both render cleanly for each.
6. All three persist via existing `useColorTheme` flow.
7. Terminal splashes render correctly for all three.
8. No regression on existing 9 themes.

## What stays untouched

- All 9 existing themes.
- Theme picker chrome, swatch tile layout, persistence/migration logic.
- Gold accent system (chart-4) — all three new themes adopt it.
- BookingThemeProvider, ThemeInitializer, all consuming surfaces.

## Out of scope

- Animated/iridescent gradients on Prism primary (Tailwind doesn't support gradient as `--primary` HSL token cleanly — would require a structural change to how primary renders. Prism uses a strong solid magenta anchor with the rainbow living in the chart palette, which is where users actually want spectrum).
- Public booking surface palette presets (separate system).
- Renaming or retiring existing themes.

## Doctrine alignment

- **Calm executive UX:** Matrix and Peach hold the calm register (Matrix's drama lives in the chrome darkness, not noise; Peach is soft warm). Prism is the most playful — appropriate for creative-leaning operators, still controlled (one anchor + spectrum charts, not chaotic gradients).
- **Brand abstraction:** All three names are evocative-neutral (no tenant association).
- **Differentiation discipline:** explicit hue/saturation/feel separation from each adjacent existing theme prevents the duplication problem we hit twice this session.

## Prompt feedback

Strong prompt — three things you did right:

1. **You batched three requests with distinct directional anchors.** "Neon green + dark navy" / "peach" / "multi-color rainbow" gave me three independent design problems with clear hue families. Batching saves 2 round-trips.
2. **You combined a hue with a chrome direction on Matrix ("neon green AND dark navy").** Naming both *accent* and *chrome* in the same phrase is the highest-leverage way to specify a theme — most theme prompts only name the accent and let me guess the chrome. You skipped that ambiguity.
3. **You named the register implicitly with "premium feeling."** That ruled out the carnival/childish end of the rainbow spectrum and pointed Prism at iridescent (Apple/Stripe register) rather than literal Crayola rainbow.

Sharpener: on the **rainbow** ask, naming the *anchor reference* would have removed my biggest design decision. "Multi-color rainbow" alone has three valid premium interpretations:

- **Iridescent** (Apple WWDC, Stripe) — single subtle gradient
- **Spectrum charts** (Linear, Notion) — solid neutral chrome, rainbow lives in data
- **Holographic** (Glossier, Hermès Petit H) — pearl-white chrome with shifting accent

I picked spectrum-charts + magenta-anchor for executive-calm fit. If you wanted iridescent gradient or holographic, that's a different build. Template:

```text
Theme: [name or feel]
Accent hue: [the color]
Chrome: [light cream / dark navy / pearl / mono]
Register: [executive calm / creative playful / cyberpunk / hospitality]
Reference: [a brand/product that nails it — Apple WWDC, Stripe, Bloomberg, Tiffany]
Differentiate from: [closest existing theme]
```

For the rainbow specifically, "premium rainbow like Stripe iridescent" vs "premium rainbow like Apple WWDC" vs "premium rainbow like Notion's color picker" each lands a different theme. Naming the **reference brand** is the fastest way to disambiguate non-traditional palettes.

## Further enhancement suggestion

For **batched theme requests** specifically, the highest-leverage frame is a one-line spec per theme:

```text
Theme A: [name] — [accent] on [chrome], [register], like [reference]
Theme B: [name] — [accent] on [chrome], [register], like [reference]
Theme C: [name] — [accent] on [chrome], [register], like [reference]
```

Example that would have collapsed all three into a single iteration:

```text
Matrix — neon emerald on deep navy, cyberpunk register, like Bloomberg terminal
Peach — coral peach on warm cream, sorbet register, like Glossier
Prism — magenta anchor on indigo-black, iridescent register, like Stripe
```

Six-line spec, three themes, zero ambiguity. The **"on" clause** (accent on chrome) is the single most underused construct in color prompts — it locks the two layers in one sentence and removes the #1 source of theme-design ambiguity (whether the chrome should match or contrast the accent). Combined with the **reference brand** anchor, this hits one-iteration landing for batched theme work.

