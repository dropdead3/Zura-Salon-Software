

# Expanded Color & Gradient System for Zura Marketing

## The Problem
Right now, the entire marketing site uses one color story: `violet-400/500/600` + `purple-400/500/600`. Every eyebrow, icon tint, gradient, CTA, text accent, and ambient glow is the same violet. It works but feels flat — there's no color hierarchy or variety across sections.

## The Palette (from your reference)
Mapped to Tailwind + custom values:

```text
Night Indigo    #1B003F  → deepest backgrounds, hero ambient glow
Twilight Purple #4B0082  → gradient midpoints, banner fills
Midnight Blue   #191970  → secondary gradients, card accents
Lavender Haze   #E6E6FA  → light text accents, ghost button borders
Dusky Blue      #6495ED  → secondary accent color, stat highlights
```

These supplement (not replace) the existing violet-400→purple-600 range.

## What Changes

### 1. New CSS custom properties (`index.css`)
Add the palette as CSS variables under `.marketing-surface` so they're scoped to marketing pages only:
```css
.marketing-surface {
  --mkt-indigo: 271 100% 12%;
  --mkt-twilight: 275 100% 25%;
  --mkt-midnight: 240 59% 26%;
  --mkt-lavender: 240 100% 94%;
  --mkt-dusky: 219 79% 66%;
}
```

### 2. Gradient Variants — Buttons & CTAs

**Primary CTA** (stays violet→purple — proven, energetic):
No change. `from-violet-600 to-purple-600` remains the primary action gradient.

**Secondary gradient option** — new indigo→dusky blue for variety:
`bg-gradient-to-r from-[hsl(var(--mkt-twilight))] to-[hsl(var(--mkt-dusky))]`
Use on: SolutionPageTemplate bottom CTA (to differentiate from homepage), PersonaExplorer CTA if re-added.

**Ghost CTA variant** — lavender-tinted border:
`border-[hsl(var(--mkt-lavender)/0.2)] text-[hsl(var(--mkt-lavender)/0.8)] hover:bg-[hsl(var(--mkt-lavender)/0.06)]`
Use on: secondary CTAs like "Explore the Platform", "See all solutions" links upgraded to ghost buttons.

### 3. Text Emphasis & Headlines

**Gradient text — expanded options:**
- **Violet→Purple** (current): Hero headline accent — keep as-is
- **Indigo→Dusky Blue** (new): `from-[#4B0082] to-[#6495ED]` for section headlines like BuiltByOperators or OutcomeMetrics — creates visual variation without clashing
- **Lavender highlight**: `text-[hsl(var(--mkt-lavender))]` as a softer white alternative for emphasized body text or pull quotes

### 4. Eyebrow Labels — Color Rotation

Currently every eyebrow is `text-violet-400`. Introduce rotation by section purpose:
- **Product/Platform sections** → `text-violet-400` (keep)
- **Results/Metrics sections** → `text-[hsl(var(--mkt-dusky))]` (dusky blue)
- **Credibility/Story sections** → `text-[hsl(var(--mkt-lavender)/0.6)]` (lavender muted)

This creates subtle section identity without being heavy-handed.

### 5. Icon Tint Variation

Currently all icon containers are `bg-violet-500/10` with `text-violet-400`. Add a second tier:
- **Primary icons** (keep): `bg-violet-500/10 text-violet-400`
- **Secondary icons** (new): `bg-[hsl(var(--mkt-dusky)/0.1)] text-[hsl(var(--mkt-dusky))]` — for ProblemStatement pain points and BuiltByOperators markers, differentiating "problem" from "solution" sections

### 6. Ambient Glows — Depth via Color

**MarketingLayout background orbs:**
- Top-right orb: keep `bg-violet-500/10`
- Bottom-left orb: change from `bg-purple-600/10` to `bg-[hsl(var(--mkt-midnight)/0.15)]` — creates a cooler, deeper anchor that contrasts the warm violet

**HeroSection ambient glow:**
- Shift from pure violet to a blend: `bg-gradient-to-b from-violet-500/20 via-[hsl(var(--mkt-twilight)/0.1)] to-transparent` — adds depth

### 7. Section Dividers & Borders

**BuiltByOperators gradient separator:**
Currently `via-violet-500/20`. Change to `via-[hsl(var(--mkt-dusky)/0.2)]` — the blue tone creates a visual "chapter break"

**OutcomeMetrics backdrop gradient:**
Currently `via-violet-500/[0.03]`. Change to `via-[hsl(var(--mkt-midnight)/0.06)]` — subtle midnight blue wash distinguishes it from FinalCTA's violet wash

### 8. Card Hover States — Color-Coded

**SolutionShowcase cards:**
Currently `hover:border-violet-500/20`. Add a subtle gradient glow on hover:
`hover:border-[hsl(var(--mkt-dusky)/0.25)] hover:shadow-[0_0_20px_hsl(var(--mkt-twilight)/0.05)]`

### 9. StatBar — Dusky Blue Accent

The stat numbers are currently plain white. The counter values could use `text-[hsl(var(--mkt-lavender))]` for a warmer white that ties to the palette, while keeping the labels in `text-slate-500`.

---

## Files Modified

| File | Changes |
|------|---------|
| `index.css` | Add `.marketing-surface` CSS custom properties for the 5 new palette colors |
| `MarketingLayout.tsx` | Update bottom-left background orb to midnight blue tint |
| `HeroSection.tsx` | Deepen ambient glow with twilight purple blend |
| `StatBar.tsx` | Lavender-tinted stat values |
| `ProblemStatement.tsx` | Dusky blue icon tint for pain point icons |
| `SolutionShowcase.tsx` | Dusky blue eyebrow, enhanced card hover glow |
| `BuiltByOperators.tsx` | Dusky blue separator + lavender eyebrow, secondary icon tint |
| `OutcomeMetrics.tsx` | Midnight blue backdrop wash, dusky blue eyebrow |
| `FinalCTA.tsx` | Keep violet gradient CTA (no change needed — it's the anchor) |
| `SolutionPageTemplate.tsx` | Indigo→dusky blue gradient on bottom CTA for variety, lavender ghost secondary elements |
| `MarketingNav.tsx` | No change — nav CTA stays violet gradient for brand consistency |
| `PersonaExplorer.tsx` | Dusky blue accent on active persona indicator |

**12 files modified. 0 new files. 0 deleted.**

## Design Rationale

The palette creates three tonal zones:
```text
WARM (action)     violet-400 → purple-600    CTAs, hero accent, primary icons
COOL (depth)      midnight → dusky blue      section variety, secondary icons, dividers
NEUTRAL (breath)  lavender → slate           text emphasis, ghost elements, stat highlights
```

This gives the site color *rhythm* — warm sections feel active, cool sections feel grounding, and the alternation keeps the eye engaged without any single color becoming monotonous.

