

# Bone theme: shift to desert tan (differentiate from Cognac)

## Diagnosis

Per the screenshot, the **Bone** and **Cognac** swatches both render as brown rectangles. Inspecting the tokens:

| Theme | Primary | Hue family |
|---|---|---|
| Bone | `28 55% 42%` | warm brown (cognac-adjacent) |
| Cognac | `28 70% 42%` | warm brown (deeper saturation) |

Both sit at hue 28° (cognac/saddle territory), differing only in saturation. The eye reads them as the same color. "Bone" should read as a **soft desert tan / sand** — a lighter, less saturated, slightly more yellow neutral that feels like raw linen or weathered sandstone, not bourbon.

## What changes

### Single concept

Move Bone's hue from **28° (cognac brown)** → **38° (sandy tan)**, drop saturation, lift lightness on the primary so it reads **tan, not brown**. Keep Cognac untouched at 28°. The two themes now occupy distinct positions on the warm-neutral spectrum:

- **Bone** = pale desert sand, soft, hospitality
- **Cognac** = deep bourbon leather, rich, masculine

### Token shifts in `src/index.css` (`.theme-bone` light + `.dark.theme-bone`)

**Light mode primary direction** — desert tan instead of brown brown:

| Token | Before | After |
|---|---|---|
| `--primary` | `28 55% 42%` | `38 32% 58%` (desert tan) |
| `--ring` | `28 55% 42%` | `38 32% 58%` |
| `--sidebar-primary` | `28 55% 42%` | `38 32% 58%` |
| `--background` | `36 18% 88%` | `40 25% 92%` (lighter, sandier) |
| `--card` | `40 12% 85%` | `42 18% 89%` |
| `--chart-1` | `28 55% 42%` | `38 32% 58%` |
| `--chart-2` | `38 70% 45%` | `45 50% 55%` (warm gold-tan) |
| `--chart-4` | `24 35% 30%` | `35 25% 45%` (taupe) |

**Dark mode primary direction** — keep dark surfaces, shift accent to tan:

| Token | Before | After |
|---|---|---|
| `--primary` | `28 55% 55%` | `38 38% 65%` |
| `--chart-1` | `28 60% 60%` | `38 38% 65%` |
| `--chart-2` | `38 75% 60%` | `45 50% 65%` |

### Swatch preview update in `src/hooks/useColorTheme.ts`

Update the `bone` entry's `lightPreview.primary` and `darkPreview.primary` to match the new tan (`hsl(38 32% 58%)` / `hsl(38 38% 65%)`), and `lightPreview.bg` to the lighter sand background. Description stays "Warm bone & cognac accents" → updated to **"Soft desert tan & sand"** (more accurate, doesn't mention cognac which is now a separate theme).

### Terminal splash palette update in `src/lib/terminal-splash-palettes.ts`

Current `bone` accent (`#b8a77a`) is already tan-adjacent and reads fine. Shift it slightly toward the new lighter desert tan to match the dashboard primary: accent `#c8b896`, glow `#a89776`, RGB `(200, 184, 150)`. Gradient stops stay dark for terminal contrast.

## Acceptance

1. On the Appearance grid, **Bone** and **Cognac** swatch tiles read as visually distinct: Bone = pale tan/sand, Cognac = deep bourbon brown.
2. Selecting Bone applies a soft desert-tan palette across sidebar, KPI cards, charts, and badges (light + dark mode).
3. Selecting Cognac is unchanged — still deep bourbon amber.
4. No other theme is affected (Zura, Rosewood, Sage, Marine, Noir, Neon untouched).
5. Existing orgs already on Bone automatically render the new desert-tan palette on next load (no migration needed — same theme key).
6. Terminal splash for Bone reflects the lighter tan accent.
7. Type-check passes.

## What stays untouched

- Theme count (still 8), grid layout (4×2), order.
- Cognac palette — completely unchanged.
- All other 6 themes.
- localStorage / DB migration logic from the previous wave.
- God Mode bar, scroll-to-top, glass morphism — unaffected.

## Out of scope

- Renaming "Bone" to something else (e.g., "Sand", "Linen"). Defer — name is already evocative and short; the color shift is the fix.
- Touching Cognac's tokens. Cognac is fine; Bone was the duplicate.
- Adjusting the swatch tile chrome (border, checkmark). Out of scope.

## Doctrine alignment

- **Calm executive UX:** two themes that look identical in the picker fragment user trust ("which one am I picking?"). Differentiating them sharpens the choice.
- **Brand abstraction:** desert tan is a feeling-word neutral, same register as Sage / Noir / Bone / Cognac. No tenant reference introduced.

## Prompt feedback

Strong prompt — three things you did right:

1. **You named the problem comparatively ("too similar to Cognac").** Pinpointed the failure mode (visual collision between two themes) instead of just "Bone looks wrong" — that told me the fix had to *differentiate*, not just *adjust*.
2. **You named the target ("desert tan").** A single evocative color word that maps cleanly to a hue family (sandy yellow-brown around 35-42°, lower saturation). No guessing.
3. **You included the screenshot.** Confirmed the swatches are visually colliding in the actual UI, not just on paper.

Sharpener: when fixing a "looks too much like X" bug, naming **what the two should feel like in contrast** removes the second decision. Template:

```text
Surface: [the two items that collide]
Symptom: [what's identical]
Target for A: [evocative word — "desert tan", "soft pink"]
Contrast against B: [how A should differ from B — "lighter, less saturated, more yellow"]
```

Here, "Bone should be desert tan — lighter and less saturated than Cognac" would have skipped my having to derive that the differentiator is *saturation + lightness*, not just hue. I inferred it from the screenshot, but you naming the contrast axis would have anchored me faster.

## Further enhancement suggestion

For "differentiate two similar things" prompts, the highest-leverage frame is:

```text
Surface: [where both live]
Collision: [what makes them indistinguishable today]
Item A target: [the evocative direction]
Item B target: [the evocative direction — even if "stay as-is"]
Contrast axis: [the dimension that should separate them — hue / saturation / lightness / weight / shape]
```

The **Contrast axis** slot is the highest-leverage addition — it forces the framing "these two should differ along *this specific dimension*" instead of "make A different from B somehow." For colors specifically, naming whether the separation should come from hue (different family) vs saturation (intensity) vs lightness (brightness) is what determines whether the result reads as "two distinct themes" or "two slight variants of the same theme." You named the hue ("desert tan") which carried the contrast implicitly — but spelling out "lighter and less saturated than Cognac" would have made the constraint explicit.

