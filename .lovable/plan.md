

# Bone theme: cool desert gray-oat (drop the yellow)

## Diagnosis

Per the screenshot, the **Bone** accent swatch reads as a yellow-mustard tan — leans warm/yellow ("vomit" register) rather than the calm, cool, oat-linen feel the name implies.

Current `.theme-bone` primary tokens:

| Mode | Value | Read |
|---|---|---|
| Light | `38 32% 58%` | yellow-warm tan, mustard-leaning |
| Dark | `38 38% 65%` | yellow-warm tan, brighter mustard |

Hue 38° sits in the **yellow-orange** family (sunflower/mustard territory). For "cool desert gray / oat," the hue needs to drop toward **30–32°** (true neutral oat) AND saturation needs to fall significantly so the color reads as a *neutral with a hint of warmth* rather than a *warm color*.

## What changes

### Single concept

Shift Bone from **warm yellow tan** → **cool desert gray-oat**: lower hue toward neutral (38° → 30°), drop saturation hard (32% → 12%), keep lightness similar. The result reads as raw oat / weathered linen / cool sandstone — a near-neutral with a barely-there warm undertone, not a yellow.

### Token shifts in `src/index.css`

**Light mode — `.theme-bone`:**

| Token | Before | After | Why |
|---|---|---|---|
| `--primary` | `38 32% 58%` | `30 14% 55%` | cool oat-gray, drops yellow |
| `--ring` | `38 32% 58%` | `30 14% 55%` | match primary |
| `--sidebar-primary` | `38 32% 58%` | `30 14% 55%` | match primary |
| `--background` | `40 25% 92%` | `35 12% 93%` | cool sand wash, less yellow |
| `--card` | `42 18% 89%` | `35 10% 91%` | cool oat surface |
| `--border` | (current) | `30 12% 82%` | neutral oat border |
| `--accent` | (current) | `30 15% 88%` | soft oat hover |
| `--chart-1` | `38 32% 58%` | `30 14% 55%` | match primary |
| `--chart-2` | `45 50% 55%` | `35 22% 60%` | warm taupe (still warm but desaturated) |
| `--chart-4` | `35 25% 45%` | `28 15% 40%` | cool taupe-brown |

**Dark mode — `.dark.theme-bone`:**

| Token | Before | After | Why |
|---|---|---|---|
| `--primary` | `38 38% 65%` | `30 16% 65%` | cool oat, no yellow |
| `--ring` | (current) | `30 16% 65%` | match primary |
| `--sidebar-primary` | (current) | `30 16% 65%` | match primary |
| `--chart-1` | `38 38% 65%` | `30 16% 65%` | match primary |
| `--chart-2` | `45 50% 65%` | `35 22% 60%` | warm taupe (desaturated) |

Background/card/sidebar dark surfaces stay where they are — the issue is the *accent yellowness*, not the chrome.

### Swatch preview update in `src/hooks/useColorTheme.ts`

Update the `bone` entry's previews to match the new oat-gray:
- `lightPreview.primary`: `hsl(30 14% 55%)`
- `lightPreview.bg`: `hsl(35 12% 93%)`
- `darkPreview.primary`: `hsl(30 16% 65%)`

Description: **"Cool desert gray & oat"** (more accurate — explicitly "cool" to differentiate from Cognac's warm bourbon).

### Terminal splash palette update in `src/lib/terminal-splash-palettes.ts`

Update `bone`:
- accent `#a8a195` (cool oat-gray)
- glow `#8a8378`
- RGB `(168, 161, 149)`
- gradient stops shift cooler: `#0a0a0a` → `#2a2826` → `#0a0a0a`

## Acceptance

1. Bone swatch tile reads as a **cool, neutral oat-gray** — not yellow, not mustard.
2. Visually distinct from Cognac (warm bourbon brown) — the contrast axis is now hue *and* saturation.
3. Selecting Bone applies the cool oat palette across sidebar, KPI cards, charts, and badges (light + dark mode).
4. Cognac unchanged.
5. No other theme affected.
6. Existing orgs on Bone automatically render the cooler palette on next load.
7. Terminal splash for Bone reflects the cool oat accent.

## What stays untouched

- All other 7 themes.
- Theme picker chrome, swatch tile layout, count, order.
- Migration logic, God Mode bar, glass morphism.

## Out of scope

- Renaming "Bone" — name still fits oat-gray better than it fit mustard tan.
- Touching dark-mode chrome backgrounds.
- Any change to Cognac.

## Doctrine alignment

- **Calm executive UX:** cool oat-gray is a quieter accent than warm mustard tan — sits closer to a neutral, fights less for attention. Aligns with "calm" register.
- **Brand abstraction:** "cool desert gray / oat" stays in evocative-neutral register.

## Prompt feedback

Strong prompt — three things you did right:

1. **You named the failure mode evocatively ("yellow vomit").** Crude but precise — instantly told me the problem is *yellowness*, not lightness or saturation in the abstract. Negative anchors with strong emotional valence are the fastest way to rule out a hue family.
2. **You named the target with two reference words ("cool desert gray, oat").** "Cool" = temperature direction. "Desert gray" = hue family (near-neutral with warm undertone). "Oat" = specific color anchor. Three independent constraints in three words.
3. **You used the verdict implicitly ("needs to be less X, more Y").** Right direction was wrong — pivot, not double-down. That told me to *change hue family*, not just *adjust saturation*.

Sharpener: the verdict structure ("less X, more Y") is great. Adding a **boundary** ("but keep it warm enough to feel like sand, not concrete") would have prevented over-correction into pure neutral gray. Template:

```text
Less: [the failure mode]
More: [the target feel]
Anchor: [a specific real-world reference — oat, linen, sandstone]
Boundary: [what NOT to lose — "still has warmth", "still desert not arctic"]
```

Here, "less yellow, more cool oat — but still warm enough to feel like dry desert sand, not cold concrete" would have given me the *floor* (don't go fully neutral) as well as the direction.

## Further enhancement suggestion

For "wrong color family" prompts, the highest-leverage frame is:

```text
Current hue family: [what it reads as today — "yellow", "warm brown"]
Target hue family: [where to land — "cool gray with warm undertone"]
Real-world anchor: [oat, linen, sandstone, concrete, fog]
Saturation direction: [more / less / same]
Temperature boundary: [the floor — "still warm" or "go fully cool"]
```

The **Temperature boundary** is the highest-leverage addition for cool/warm shifts — it tells me whether you want a *neutral* (saturation → 0) or a *near-neutral with character* (saturation 10–15%). Without it, "less yellow" could mean "cool gray" (boring), "cool oat" (what you wanted), or "blue-tinted gray" (over-correction). Naming the floor — "still warm enough to feel like sand" — keeps the result on-target. For neutrals specifically, the `saturation 10–18%` band is the "neutral with character" sweet spot; below 10% it reads as flat gray, above 20% it starts asserting a hue. Naming the band you want (or the anchor that lives in it — oat, linen, fog) cuts iteration count.

