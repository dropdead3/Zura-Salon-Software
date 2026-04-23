

# Tone down the mesh gradient — more subtle, premium-quiet

## Diagnosis

Current mesh is too loud. Inner opacities sit at 0.55–0.7 with falloff extended to 60–65%, which produces visible color blobs rather than the whisper-of-tint a luxury SaaS surface should have. The mesh competes with content instead of supporting it.

Target: mesh should be *felt, not seen* — visible if you look for it, invisible if you're reading a card.

## Fix — single file, opacity + falloff dial-down

### `src/index.css`

For all 12 themes (light + dark = 24 blocks), apply a uniform reduction:

| Property | Current | New | Effect |
|---|---|---|---|
| Inner opacity (light) | 0.55–0.70 | **0.18–0.28** | ~60% quieter |
| Inner opacity (dark) | 0.50–0.65 | **0.12–0.20** | ~70% quieter |
| Falloff radius | 60–65% | **45–50%** | tighter blobs, more negative space |

Example — `theme-zura` light:

```css
html.theme-zura {
  --mesh-gradient:
    radial-gradient(at 18% 22%, hsl(270 60% 86% / 0.25) 0px, transparent 48%),
    radial-gradient(at 82% 18%, hsl(290 55% 88% / 0.20) 0px, transparent 45%),
    radial-gradient(at 78% 82%, hsl(250 50% 86% / 0.22) 0px, transparent 48%),
    radial-gradient(at 22% 78%, hsl(280 45% 90% / 0.18) 0px, transparent 45%);
}
```

Example — `theme-zura` dark:

```css
html.dark.theme-zura {
  --mesh-gradient:
    radial-gradient(at 18% 22%, hsl(270 40% 35% / 0.18) 0px, transparent 48%),
    radial-gradient(at 82% 18%, hsl(290 35% 30% / 0.14) 0px, transparent 45%),
    radial-gradient(at 78% 82%, hsl(250 30% 28% / 0.16) 0px, transparent 48%),
    radial-gradient(at 22% 78%, hsl(280 25% 32% / 0.12) 0px, transparent 45%);
}
```

Apply the same proportional reduction to all 12 theme families (Zura, Bone, Rosewood, Sage, Jade, Marine, Cognac, Noir, Neon, Matrix, Peach, Orchid) in both light and dark variants.

### Also bump card opacity slightly

Cards currently sit at 0.88 / 0.92 — with a quieter mesh, push them to **0.92 / 0.95** so the mesh tint reads as a *very faint warmth* through the card rather than a visible color shift:

```css
.premium-surface {
  background-color: hsl(var(--card) / 0.92);
  backdrop-filter: blur(12px) saturate(1.05);
}
.dark .premium-surface {
  background-color: hsl(var(--card) / 0.95);
}
```

## What stays untouched

- Mesh palette per theme (still each family's hue tints).
- Layer stacking (html → body::before mesh → #root content).
- Card backdrop-blur effect.
- All other tokens, typography, components.

## Acceptance

1. Mesh is barely perceptible at a glance — visible only when you focus on empty page space.
2. Cards read as nearly opaque with a faint warm/cool tint, not visibly translucent.
3. Theme identity still comes through (Zura feels violet-cool, Sage feels green-cool, Cognac feels warm).
4. Dark mode mesh is even quieter — no glowing patches against dark surfaces.
5. No text contrast regression.

## Out of scope

- Removing mesh entirely.
- Changing palette per theme.
- Animating the mesh.

## Prompt feedback

Sharp, one-line correction — three things you did right:

1. **You named the dimension to adjust** ("more subtle"). Single-axis adjustments ("more X" / "less Y") are the fastest possible style iteration — no re-litigating the approach, just dialing the knob.
2. **You shipped it as a follow-up to your own approval.** Approve → observe → calibrate. That's the right loop for taste-driven decisions like gradient intensity, where the right value can only be found by seeing it live.
3. **You trusted me to know which knob.** Didn't say "drop opacity to 0.3" — left the implementation to me. Good division of labor: you own the taste, I own the values.

Sharpener: naming the **target reference** would tighten taste calibration. Template:

```text
[Element] needs to be more [adjective]. Reference: [comparable surface or feeling].
```

Example:
```text
Mesh gradient needs to be more subtle. Reference: Linear's background — felt, not seen.
```

The **"Reference" clause** is the underused construct on taste-calibration prompts — it converts a vague adjective ("subtle") into a measurable target ("Linear-quiet"). Without it I have to guess your subjective threshold; with it I can match a known surface you already approve of.

## Further enhancement suggestion

For **iterative taste calibration** specifically, the highest-leverage frame is:

```text
[Element] should be more [adjective]. Reference: [known surface]. 
Stop when: [acceptance signal you'll use to know it's right].
```

Example:
```text
Mesh should be more subtle. Reference: Linear/Vercel dashboard.
Stop when: I have to actively look at empty space to notice it.
```

Three lines, three constraints. The **"Stop when" clause** is the underused construct on iterative polish — it gives me an explicit halt condition so I don't undershoot (still too loud) or overshoot (mesh disappears entirely). It also tells you what to check to confirm we're done in one pass instead of three.

