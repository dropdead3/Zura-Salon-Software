

# Rebuild light mode palettes — make them actually light, distinct, and theme-true

## Diagnosis

The light themes don't break technically — `theme-*` classes apply correctly, `.dark` toggles correctly, mesh gradient is wired. The **palette values themselves are broken** for several themes. Three concrete failures:

### Failure 1 — Some light themes are too dark to read as "light mode"

| Theme | `--background` lightness | `--card` lightness | Reads as |
|---|---|---|---|
| Bone | **93%** | **91%** | washed gray |
| Sage | **82%** ⚠️ | **85%** ⚠️ | dark mint, not light |
| Rosewood (light) | likely similar | — | dusty pink |
| Marine | 97% | 99% | crisp ✓ |
| Zura | 95% | 97% | crisp ✓ |
| Jade | 95% | 97% | crisp ✓ |
| Noir | 96% | 98% | crisp ✓ |

Sage's light background at **82% L** is darker than most apps' *muted* tone. That's why "light mode doesn't follow the theme" — the user picks Sage, gets a dim olive surface that looks broken.

### Failure 2 — Card surfaces don't contrast against background

In a proper light theme, cards should be **lighter** than the page background (so they "lift"). In Bone (`bg 93%` / `card 91%`), Sage (`bg 82%` / `card 85%`), the cards are roughly *equal* lightness — no elevation, no hierarchy. The 3-tier material system can't do its job because the colors don't support it.

### Failure 3 — Each theme picks the wrong "lightness anchor"

Crisp light themes (Marine, Zura, Jade, Noir, Cognac) all use **bg ~95%, card ~97%**. Broken themes (Bone, Sage) use **bg 82-93%, card 85-91%**. The palettes were authored independently instead of from a shared spec.

## Fix — rebuild all 12 light themes against a single luxury-light spec

### The spec (one source of truth)

Every light theme adopts this lightness ladder (saturation is per-theme, hue is per-theme):

| Token | Lightness | Role |
|---|---|---|
| `--background` | **97%** | Page surface — bright but tinted |
| `--card` | **99%** | Cards lift above background |
| `--card-inner` | **96%** | Nested cards (Tier 2 solid) |
| `--card-inner-deep` | **94%** | Tier 3 flat |
| `--secondary` | **93%** | Buttons, chips |
| `--muted` | **94%** | Subtle fills |
| `--muted-strong` | **88%** | Stronger muted fills |
| `--accent` | **90%** | Accent fills |
| `--border` | **88%** | Hairlines |
| `--input` | **94%** | Input fields |
| `--popover` | **99%** | Same as card |
| `--sidebar-background` | **96%** | Sidebar surface |
| `--foreground` | **8%** | Primary text |
| `--muted-foreground` | **42%** | Secondary text |

Saturation per family — keep each theme's identity:
- **Zura/Orchid**: 20–25% saturation on neutrals (violet wash)
- **Sage/Jade/Matrix**: 18–22% (green wash)
- **Marine**: 25–30% (cool blue wash)
- **Cognac/Peach**: 20–25% (warm amber wash)
- **Rosewood/Neon**: 20–25% (rose wash)
- **Bone**: 10–14% (near-neutral)
- **Noir**: **0%** (pure mono)

`--primary` stays each theme's signature accent — those are already correct.

### Specific theme fixes (lightness only — saturation/hue preserved)

| Theme | Current bg / card | New bg / card |
|---|---|---|
| Bone | 93% / 91% | **97% / 99%** |
| Sage | 82% / 85% | **97% / 99%** |
| Rosewood (light) | needs audit | **97% / 99%** |
| Jade | 95% / 97% | 97% / 99% (minor) |
| Marine | 97% / 99% | ✓ already correct |
| Zura | 95% / 97% | 97% / 99% (minor) |
| Cognac | 94% / 96% | 97% / 99% |
| Noir | 96% / 98% | 97% / 99% |
| Neon | 97% / 100% | 97% / 99% (cap card at 99) |
| Matrix | needs audit | **97% / 99%** |
| Peach | 96% / needs audit | **97% / 99%** |
| Orchid | needs audit | **97% / 99%** |

### Card visibility check — fix the 3-tier system on light

With `card 99%` against `background 97%`, glass cards now actually lift. Also adjust:

- `.premium-surface` light-mode opacity: bump to `0.96` (from `0.92`) — on a near-white page, cards should be nearly opaque so the mesh tint reads as warmth, not transparency.
- Add a 1px `border-border/60` on tier-1 cards in light mode for definition (already in tokens, just verify).

### Sidebar contrast pass

Many light themes have sidebars at the same lightness as background (no separation). Standardize sidebar at **96%** so it sits one notch below the page surface. Border `88%` to demarcate.

## Files touched

- `src/index.css` — all 12 light theme blocks (Bone, Rosewood, Sage, Jade, Marine, Zura, Cognac, Noir, Neon, Matrix, Peach, Orchid). Dark themes untouched.
- `src/index.css` — `.premium-surface` light-mode opacity bump.

No component logic changes. No token-system changes. No theme selector changes. Pure palette rebuild.

## Acceptance

1. Switching to light mode on **any** of the 12 themes produces a bright, premium, near-white surface.
2. Each theme's identity is unmistakable on light mode (Sage feels green-washed, Cognac feels warm amber, Zura feels violet-cool, Bone feels neutral-warm).
3. Cards visibly lift above the page background — you can see the elevation without squinting.
4. The 3-tier material system reads clearly: glass parent → solid nested → flat tertiary.
5. Sidebar reads as a distinct surface, not the same color as the page.
6. Mesh gradient still tints subtly — never overwhelms.
7. No text contrast regressions (all text still passes WCAG AA against new surfaces).
8. Dark mode untouched and still works.

## Out of scope

- Restructuring how theme classes are applied (`useColorTheme` works — verified).
- Changing `DashboardThemeContext` light/dark toggle (works — verified).
- Marketing site styling (`Layout.tsx` force-applies `theme-bone` light mode intentionally).
- Platform admin theme isolation (separate system).
- Adding new themes.
- Dark mode palette adjustments.

## Why the rebuild instead of patching one theme

Patching Sage alone would just relocate the inconsistency. The real defect is **no shared lightness spec** across themes — each was authored ad-hoc. Establishing the 97/99/96/94 ladder once, then applying it across all 12, fixes the immediate problem (Sage/Bone too dark) and prevents the next one (the next theme added drifts again).

## Prompt feedback

Sharp problem report — three things you did right:

1. **You named the symptom precisely** ("light modes don't work, won't follow the theme selected"). That's two distinct claims — broken visually + not theme-respecting — which let me check both axes instead of guessing.
2. **You said "all" instead of "this one"**. Telling me the scope upfront ("rebuild all light modes") prevents me from proposing a one-theme patch when the real problem is systemic.
3. **You used "rebuild" — the right verb.** "Fix" would invite a band-aid. "Rebuild" gives me license to establish a shared spec instead of patching values one-by-one.

Sharpener: naming the **theme(s) you tested** would tighten diagnosis. Template:

```text
[Subsystem] is broken. Tested: [theme A on route X, theme B on route Y]. 
Expected: [behavior]. Actual: [behavior].
```

Example:

```text
Light modes don't work. Tested: Sage + Bone on /dashboard.
Expected: bright themed surface. Actual: dim gray/olive, cards don't lift.
```

The **"Tested" clause** is the underused construct on system-wide bug reports — it pre-confirms the regression is reproducible across surfaces, so I skip the "is this one route or all routes?" investigation and go straight to root cause.

## Further enhancement suggestion

For **palette/visual-system regressions** specifically:

```text
[System] is broken across [scope]. Examples: [theme A → symptom, theme B → symptom].
Expected: [reference behavior]. 
Constraint: [what must stay true — e.g. don't break dark mode].
```

Example:

```text
Light modes broken across all 12 themes. Examples: Sage reads dim olive, Bone reads gray.
Expected: bright tinted surface like Marine or Zura currently render.
Constraint: don't change dark mode; preserve each theme's hue identity.
```

Four lines, four constraints. The **"Constraint" clause** is the highest-leverage addition on rebuild prompts — it tells me what I cannot trade away, so I don't accidentally fix light mode by flattening every theme into the same beige.

