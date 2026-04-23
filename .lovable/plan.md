

# Fix Rose Gold dark mode — calmer mesh + cleaner duotone

## What's wrong (visible in your screenshot)

Three issues stack to make dark mode read as a heavy, muddy brown wash:

1. **Mesh gradient is 2× too bright.** Rose Gold's dark mesh uses `38 65% 38%` lightness at `0.22` opacity. Every other dark theme uses `~18% lightness` at `0.18` opacity. That's why the page glows orange-brown from corner to corner instead of sitting back as a quiet ambient tint.
2. **Gold primary is over-saturated for dark.** `38 65% 64%` reads as bright caramel-yellow, not metallic gold — it competes with text and creates that "everything is gold" feeling you see in the KPI numbers.
3. **Pink secondary is invisible.** At `345 32% 58%`, the dusty pink sits in the same mid-luminance zone as the gold mesh, so it gets absorbed into the brown wash. There's no pink presence anywhere on screen — the duotone collapses back to monotone gold.

The light mode works because the bright canvas gives both colors room to breathe. Dark mode is fighting itself.

## The fix

### 1. Calm the mesh gradient (biggest visual impact)

Bring Rose Gold dark mesh in line with every other dark theme — deep, low-opacity tints that suggest the palette without dominating it.

**Current (too loud):**
```css
html.dark.theme-orchid {
  --mesh-gradient:
    radial-gradient(at 18% 22%, hsl(38 65% 38% / 0.22) 0px, transparent 50%),
    radial-gradient(at 82% 78%, hsl(345 40% 40% / 0.22) 0px, transparent 50%),
    ...
}
```

**New (matches sibling themes):**
```css
html.dark.theme-orchid {
  --mesh-gradient:
    radial-gradient(at 18% 22%, hsl(38 45% 18% / 0.18) 0px, transparent 48%),
    radial-gradient(at 82% 18%, hsl(345 35% 16% / 0.14) 0px, transparent 45%),
    radial-gradient(at 78% 82%, hsl(345 38% 18% / 0.16) 0px, transparent 48%),
    radial-gradient(at 22% 78%, hsl(38 40% 15% / 0.12) 0px, transparent 45%);
}
```

What changes:
- Lightness drops from `38%/40%` → `15-18%` (matches every other dark theme)
- Opacity drops from `0.22` → `0.18/0.16/0.14/0.12` (matches the standard 4-stop falloff)
- Pink moved to two of the four corners so the page reads gold-on-top, pink-on-bottom (or alternating), not all-gold

Result: the canvas goes from "glowing orange-brown" to "warm near-black with subtle gold/pink hints in the corners" — same vibe as Cognac or Rosewood dark, just with the gold + pink character.

### 2. Refine the gold primary

Drop saturation slightly and shift hue 2° warmer so it reads as **metallic champagne** instead of caramel-yellow.

| Token | Current | New | Why |
|---|---|---|---|
| `--primary` | `38 65% 64%` | `36 52% 62%` | Less saturated, slightly warmer hue → reads metallic, not neon |
| `--ring` | `38 65% 64%` | `36 52% 62%` | Match primary |
| `--sidebar-primary` | `38 65% 64%` | `36 52% 62%` | Match primary |
| `--gold` | `38 70% 62%` | `36 55% 60%` | Match primary character |
| `--chart-1` | `38 65% 64%` | `36 52% 62%` | Match primary |
| `--chart-3` | `38 60% 54%` | `36 48% 52%` | Match primary tone |
| `--warning` | `38 85% 55%` | `36 80% 58%` | Slight shift to align with new gold |

### 3. Boost pink so the duotone actually appears

The pink needs more saturation and slightly lighter luminance to escape the gold wash and become visible as a distinct color.

| Token | Current | New | Why |
|---|---|---|---|
| `--secondary` | `345 32% 58%` | `345 45% 64%` | Higher saturation + lift → reads as actual pink, not muddy mauve |
| `--accent` | `345 22% 22%` | `345 28% 20%` | Slightly more saturated pink shadow surface |
| `--sidebar-accent` | `345 22% 22%` | `345 28% 20%` | Match accent |
| `--chart-2` | `345 32% 58%` | `345 45% 64%` | Match secondary |
| `--chart-4` | `345 38% 50%` | `345 50% 56%` | Brighter pink for chart variety |

### 4. Lift surface contrast slightly

The current backgrounds are too close in lightness, which makes cards blur into the page. One small adjustment opens the elevation ladder.

| Token | Current | New | Why |
|---|---|---|---|
| `--background` | `30 18% 6%` | `30 16% 5%` | Slightly deeper page so cards lift more |
| `--card` | `30 16% 9%` | `30 14% 10%` | Slightly less saturated, better lift |
| `--card-inner` | `30 14% 11%` | `30 12% 12%` | Cleaner nested tier |
| `--muted` | `30 12% 14%` | `30 10% 15%` | Less brown saturation, more neutral |
| `--border` | `30 14% 18%` | `30 12% 20%` | Slightly more visible hairline |

The hue stays warm (`30°`) so the rose-gold identity is preserved, but lower saturation on neutrals stops them from reading as "brown" and lets the gold + pink accents pop.

## Files touched

| File | Change |
|---|---|
| `src/index.css` | Rewrite `.dark.theme-orchid` token block (lines 1542-1601). Rewrite `html.dark.theme-orchid` mesh gradient (lines 3105-3111). |

Light mode untouched. Class key untouched. No migration needed.

## Acceptance

1. Dark mode page no longer reads as a uniform orange-brown wash — backgrounds are warm near-black with subtle ambient tinting, matching the calm of other dark themes (Cognac, Rosewood, Cream Lux).
2. Gold primary CTAs and KPI numbers read as **metallic champagne**, not bright caramel-yellow. They feel premium, not cartoonish.
3. Pink secondary chips, badges, and accent surfaces are **actually visible** as pink — you can point at the secondary buttons and see a clearly different color from the gold.
4. Cards lift cleanly above the background — the elevation ladder reads at a glance.
5. Light mode is unchanged and still looks good.
6. Mesh gradient still suggests gold + pink at the macro level, but quietly — it's an ambient hint, not a saturation bomb.
7. WCAG AA text contrast passes on all surfaces (gold-on-dark, pink-on-dark, text-on-gold, text-on-pink).
8. No other theme is touched.

## Out of scope

- Light mode adjustments (you said it looks good — leaving it alone).
- Touching any other theme's dark mode.
- Renaming the CSS class.
- Changing role assignments (gold stays primary, pink stays secondary).
- Modifying the mesh gradient pattern/positions globally — only Rose Gold's dark mesh is rewritten.

## Prompt feedback

Solid, well-targeted correction — three things you did right:

1. **You scoped the problem to one mode.** "Dark mode looks horrible, light mode looks good" is far more actionable than "the theme looks bad" — it tells me exactly which palette block to touch and which to leave alone, cutting the work in half.
2. **You attached a screenshot of the broken state.** That single image saved 3-4 rounds of "what specifically looks wrong?" — I could see the brown wash, the over-saturated gold KPIs, and the missing pink immediately.
3. **You used aesthetic language ("prettier")** instead of prescribing specific HSL values. That gives me license to diagnose the root cause (mesh + saturation + pink invisibility) instead of getting locked to a single fix that might not address what's actually wrong.

Sharpener: when reporting a "looks bad" issue, naming **which specific element bothers you most** would tighten the diagnosis. Template:

```text
[Theme] in [mode] looks [adjective] — specifically, 
[component X] reads as [wrong quality] when it should be [right quality].
```

Example:
```text
Rose Gold in dark mode looks muddy — specifically, the whole page reads as one brown wash 
and I can't see the pink anywhere. The gold KPI numbers also feel too bright/yellow.
```

The **"specifically, [element] reads as [quality]"** clause is the underused construct on aesthetic-correction prompts — without it I have to guess whether the issue is the mesh, the primary color, the pink visibility, or all three (it was all three this time). Naming the element you noticed first would let me prioritize the fix even faster.

