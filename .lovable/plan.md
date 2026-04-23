

# New theme: **Jade** — premium teal/mint jewel-tone

## Diagnosis

The palette already has **Sage** (mid-mint green, hue 145°, soft pastel-leaning). A second green-family theme must differentiate on three axes or it will read as "Sage 2":

| Axis | Sage | Jade (new) |
|---|---|---|
| Hue | 145° (true green, leaf) | 175° (teal, spa/jewel) |
| Saturation register | medium pastel | deep jewel-tone |
| Feel | calming, herbal, soft | premium, oceanic, luxury (Tiffany / Aman / Four Seasons) |
| Anchor reference | sage leaf, eucalyptus | jade stone, deep teal velvet, emerald sea |

Hue 175° sits at the **teal/cyan-green boundary** — distinctly bluer than mint, distinctly greener than ocean. Pairs naturally with the system's gold accent (chart-4) for the "jewel + warm metal" pairing that reads as luxury hospitality.

## What changes

### Single concept

Add an **8th theme called Jade** — premium deep-teal jewel-tone with gold accent. Slots between Sage (calming green) and Marine (electric blue) in the spectrum. Reads as Tiffany / spa / Aman, not as "another mint."

### 1. `src/hooks/useColorTheme.ts`

- Add `'jade'` to `ColorTheme` union and `ALL_THEMES` array
- Add `jade: 'Herb Garden'` (closest match) to `COLOR_THEME_TO_CATEGORY_MAP`
- Append entry to `colorThemes` array:

```ts
{
  id: 'jade' as ColorTheme,
  name: 'Jade',
  description: 'Deep teal jewel & gold',
  lightPreview: {
    bg: 'hsl(180 20% 95%)',
    accent: 'hsl(178 25% 85%)',
    primary: 'hsl(175 65% 32%)',
  },
  darkPreview: {
    bg: 'hsl(180 35% 6%)',
    accent: 'hsl(178 30% 16%)',
    primary: 'hsl(172 70% 45%)',
  },
}
```

### 2. `src/index.css` — add `.theme-jade` + `.dark.theme-jade` blocks

Mirror Sage's structure, swap palette to deep teal jewel-tone:

**Light mode `.theme-jade` core tokens:**

| Token | Value | Why |
|---|---|---|
| `--background` | `180 20% 95%` | cool teal-tinted off-white |
| `--card` | `180 15% 97%` | barely-tinted card surface |
| `--popover` | `180 15% 97%` | match card |
| `--primary` | `175 65% 32%` | deep jade — saturated, jewel-tone, not pastel |
| `--primary-foreground` | `0 0% 100%` | white on jade |
| `--secondary` | `178 18% 88%` | soft teal surface |
| `--muted` | `178 12% 90%` | quieter teal |
| `--muted-foreground` | `180 15% 35%` | readable teal-gray text |
| `--accent` | `178 25% 85%` | hover state |
| `--gold` | `42 75% 45%` | gold pairing (matches doctrine) |
| `--chart-1` | `175 65% 32%` | match primary |
| `--chart-2` | `185 55% 45%` | brighter cyan-teal complement |
| `--chart-3` | `155 45% 40%` | green-jade bridge |
| `--chart-4` | `42 75% 45%` | gold differentiator (executive accent) |
| `--chart-5` | `220 60% 50%` | deep blue contrast |
| `--border` | `178 15% 82%` | teal-tinted border |
| `--input` | `178 15% 88%` | teal-tinted input |
| `--ring` | `175 65% 32%` | match primary |
| `--sidebar-background` | `178 18% 92%` | soft teal sidebar |
| `--sidebar-primary` | `175 65% 32%` | match primary |
| `--sidebar-accent` | `178 20% 86%` | active state |
| `--sidebar-border` | `178 15% 82%` | match border |

**Dark mode `.dark.theme-jade` core tokens:**

| Token | Value | Why |
|---|---|---|
| `--background` | `180 35% 6%` | rich deep-teal chrome (visibly teal, not gray-black) |
| `--card` | `180 30% 11%` | teal-rich card surface |
| `--popover` | `180 30% 11%` | match card |
| `--primary` | `172 70% 45%` | luminous jade — pops on dark teal |
| `--primary-foreground` | `180 35% 6%` | dark-teal text on jade button |
| `--secondary` | `178 25% 16%` | teal-rich secondary |
| `--muted` | `180 22% 18%` | quieter teal |
| `--muted-foreground` | `178 18% 65%` | readable text |
| `--accent` | `178 30% 16%` | hover state |
| `--gold` | `42 75% 50%` | gold pairing |
| `--chart-1` | `172 70% 55%` | match primary, slightly brighter for charts |
| `--chart-2` | `185 65% 60%` | bright cyan-teal |
| `--chart-3` | `155 50% 55%` | green-jade bridge |
| `--chart-4` | `42 80% 55%` | gold |
| `--chart-5` | `220 70% 65%` | deep blue contrast |
| `--border` | `180 22% 18%` | teal-tinted border |
| `--input` | `180 22% 16%` | teal-tinted input |
| `--ring` | `172 70% 45%` | match primary |
| `--sidebar-background` | `180 35% 5%` | deep teal sidebar |
| `--sidebar-primary` | `172 70% 45%` | match primary |
| `--sidebar-accent` | `180 28% 13%` | active state |
| `--sidebar-border` | `180 22% 18%` | match border |
| `--card-inner` | `180 25% 9%` | nested card |
| `--card-inner-deep` | `180 25% 7%` | deepest nested |

(Full token blocks will mirror the structure of `.theme-sage` / `.dark.theme-sage` for completeness — `--success`, `--warning`, `--destructive`, `--oat`, all sidebar tokens, etc.)

### 3. `src/lib/terminal-splash-palettes.ts`

Add `jade` palette entry:

```ts
jade: palette(
  ['#04141a', '#0a3338', '#04141a'],
  '#1cb39c',   // luminous teal accent
  '#149782',   // deeper glow
  28, 179, 156,
),
```

## Acceptance

1. New **Jade** swatch appears in theme picker as the 8th option (after Neon, or grouped with greens after Sage — order to confirm).
2. Jade swatch reads as **deep jewel teal**, distinctly bluer than Sage and distinctly greener than Marine — no confusion with either.
3. Selecting Jade in light mode: sidebar, primary buttons, focus rings, chart-1 series read as **deep jade** with gold chart-4 accent.
4. Selecting Jade in dark mode: chrome reads as **rich deep-teal** (visibly teal, not gray), accent pops as **luminous jade**.
5. Theme persists to `site_settings` via existing `useColorTheme` flow.
6. Terminal splash for Jade shows deep teal gradient + luminous teal accent.
7. No other theme is affected.
8. All 8 themes render correctly side-by-side in the Appearance grid.

## What stays untouched

- All 7 existing themes.
- Theme picker chrome, swatch tile layout, persistence flow, migration logic.
- Gold accent system (chart-4) — Jade adopts it like Marine and Bone.
- BookingThemeProvider, DashboardThemeContext, ThemeInitializer — Jade flows through existing infrastructure.

## Out of scope

- Renaming or retiring any existing theme.
- Adding theme to public booking surface palette presets (separate system; can follow if requested).
- Adjusting Sage to make room — Jade is a distinct sibling, not a replacement.

## Doctrine alignment

- **Calm executive UX:** jewel-tone teal + gold reads as luxury hospitality (Aman, Four Seasons, Tiffany), not loud.
- **Brand abstraction:** "Jade" is evocative-neutral, no tenant association.
- **Differentiation discipline:** explicit hue/saturation/feel separation from Sage prevents the Bone/Cognac duplication problem from earlier this session.

## Prompt feedback

Solid prompt — three things you did right:

1. **You named the register ("premium")** — that's a *quality anchor* that ruled out the pastel/casual end of the mint-teal spectrum and pointed me at jewel-tone luxury (Aman, Tiffany, Four Seasons cluster). Without "premium," I might have built another soft pastel like Sage.
2. **You named two adjacent hues ("mint/teal")** — the slash signals "somewhere between these two," which is exactly the teal jewel-tone band (175°). If you'd said "mint" alone, I'd have gone closer to Sage and risked the duplication problem we just fixed with Bone/Cognac. The slash bought you the differentiation gap.
3. **You used "create"** — explicit signal it's a *new theme*, not a tweak to Sage. Saved a clarification round.

Sharpener: naming the **adjacency you want to avoid** removes the biggest risk on a "new color" prompt — duplication with an existing one. Template:

```text
New theme: [name or feel]
Register: [premium / casual / playful / minimal]
Anchor: [real-world reference — Tiffany, Aman, jade stone]
Differentiate from: [the closest existing theme — "distinctly bluer than Sage"]
Pair with: [accent direction — gold, copper, neutral]
```

Here, "premium mint/teal — distinctly bluer than Sage, paired with gold like Marine" would have locked in the differentiation axis and the accent-pairing in one line, removing my need to infer both. You gave me enough to land it, but the **"distinctly different from X"** slot is the highest-leverage addition for any new-color prompt because color-space duplication is the #1 failure mode (we lived it twice this session with Bone/Cognac and Bone yellow→oat).

## Further enhancement suggestion

For "add a new theme" prompts specifically:

```text
Name suggestion: [optional — leave blank to let me name it]
Hue family: [mint, teal, jade, emerald, ocean]
Register: [pastel / mid / jewel-tone / deep]
Real-world anchor: [Tiffany blue, jade stone, spa, Aman, eucalyptus]
Differentiate from: [the closest existing theme by name + axis]
Pair with: [gold / silver / copper / neutral]
Mood: [calm / energetic / executive / playful]
```

The **"Differentiate from + axis"** field is the single most valuable addition. For colors, "make it teal" leaves a 60° hue band open; "make it teal, distinctly bluer than Sage" closes it to a 15° band. Same number of words, 4× the precision. Combined with the **register** field (pastel vs jewel-tone), these two constraints alone usually land the theme in one iteration without follow-ups. The **mood** field is a tiebreaker when register + hue still leave two valid directions (e.g., "jewel-tone teal" could be Tiffany-playful or Aman-calm — naming "executive calm" picks the lane).

