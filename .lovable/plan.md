

# Add "Neon" theme — hot pink + black

A new color theme joining the existing 7 (Zura, Cream, Rose, Sage, Ocean, Ember, Noir). Hot pink primary (`330 95% 55%`) on near-black surfaces — bold, high-contrast, club aesthetic. Distinct from **Rose** (soft blush) by being saturated and electric, and from **Noir** (pure monochrome) by carrying a chromatic accent.

## Palette

**Light mode** — warm-white background, hot pink primary, near-black text. Used rarely but must look intentional.
**Dark mode** (primary use) — deep black background (`0 0% 4%`), hot pink primary (`330 95% 60%`), pink-tinted surfaces.

Anchor tokens:
```
--primary:        330 95% 55% (light) / 330 95% 60% (dark)   ← hot pink
--background:     330 15% 97% (light) / 0 0% 4% (dark)
--accent:         330 35% 90% (light) / 330 25% 18% (dark)
--ring:           330 95% 55% / 330 95% 60%
--chart-1..5:     pink → magenta → fuchsia ramp
```

All other tokens (success, warning, destructive, oat, gold, border, sidebar) follow the same structural pattern as existing themes — only hue/saturation shift.

## Files affected

| File | Change |
|---|---|
| `src/index.css` | Add `.theme-neon` (light) and `.dark.theme-neon` blocks after the noir blocks (~lines 985+). Mirrors the structure of every other theme — full token set for both modes. |
| `src/hooks/useColorTheme.ts` | Add `'neon'` to `ColorTheme` type, `ALL_THEMES` array, `COLOR_THEME_TO_CATEGORY_MAP` (mapped to `'Rose Garden'` quick theme), and a new entry in the `colorThemes` metadata array with name "Neon", description "Hot pink & black", and light/dark previews. |
| `src/components/layout/Layout.tsx` | Add `'theme-neon'` to the two `classList.remove(...)` calls so cream-mode public routes correctly strip it. |
| `src/components/dashboard/settings/WebsiteSettingsContent.tsx` | Add `'neon'` to the `validSchemes` array. |
| `src/lib/terminal-splash-palettes.ts` | Add `neon` palette entry: gradient stops `['#0a0408', '#3d1024', '#0a0408']`, accent `#ff2d8a`, glow `#d4206e`, RGB `255, 45, 138`. Required — `terminalPalettes` is typed `Record<ColorTheme, TerminalPalette>` so omitting it is a type error. |
| `src/components/dashboard/settings/EmailBrandingSettings.tsx` | Add `neon: '#FF2D8A'` to the email accent color map. |

No DB changes. No new components. No migrations.

## Acceptance

1. The Appearance settings panel (`/admin/settings`) shows Neon as an 8th color theme card with hot pink + black previews.
2. Selecting Neon applies hot pink primary across sidebar, buttons, focus rings, charts, and the Z floating action button.
3. Theme persists via existing `useColorTheme` flow (localStorage + `site_settings`) — no bespoke logic needed.
4. Dark mode is the intended showcase; light mode is functional and legible.
5. Terminal splash screens render with hot pink accent when Neon is active.
6. Public marketing routes (Layout.tsx) still force cream theme — Neon does not leak to public surfaces.
7. Email branding accent picks up hot pink when org theme is Neon.
8. Type-check passes (`ColorTheme` union updated everywhere it's referenced).

## What stays untouched

- Theme switching mechanism (`useColorTheme`, `applyTheme`, `THEME_CLASSES`).
- Existing 7 themes — unchanged.
- Platform admin theme isolation (Neon is org-side only).
- Light/Dark/System mode toggle — orthogonal to color theme.

## Naming choice

"Neon" over "Hot Pink" because: (a) consistent one-word naming with the other 7 themes, (b) signals the *aesthetic* (electric, club, late-night) not just the color, (c) leaves room for the theme to evolve toward a broader neon palette without renaming.

## Out of scope

- A second neon variant (cyan, lime). Trigger: operator asks for "more neons."
- Animated/glow effects on Neon-themed surfaces. Trigger: explicit ask — current discipline is calm executive UX, glow effects would break that.
- Per-component neon-specific overrides. The token system handles propagation; bespoke overrides would fragment the theme architecture.

## Prompt feedback

Tight, concrete prompt — six words that fully specify the ask. Two strengths:

1. **You named the colors, not an emotion.** "Hot pink and black" gives me the palette directly; "edgy theme" or "bold theme" would have left me guessing primary/background/accent and risked landing on something off-tone.
2. **You phrased it as an addition, not a replacement.** "Can we make a..." signals it joins the existing themes rather than reskinning one — no ambiguity about scope.

Sharpener: when adding to a known set (themes, levels, roles, statuses), naming the **anchor tokens** removes one decision. Template:

```text
Add: [item] to [set]
Primary: [color/value]
Background: [color/value]
Mode emphasis: [light / dark / both equally]
Tone (optional): [calm / electric / editorial — informs accent + chart palette]
```

Here, "Hot pink primary on near-black, dark-mode-first, electric tone" would have skipped my proposing-then-defending dark-mode emphasis and the Neon vs Hot Pink naming.

## Further enhancement suggestion

For "add a variant to a typed set" prompts, the highest-leverage frame is:

```text
Add: [variant name] to [set]
Anchor: [the one token that defines this variant — primary color, hierarchy rank, tier price]
Differentiator: [what makes it not-X, where X is the closest existing variant]
Mode/scope: [where it applies — dark only, all modes, specific persona]
```

The **Differentiator** slot is the most-leverage addition — it forces the framing "how is this not Rose? not Noir?" upfront, which is exactly the question that determines whether the variant earns its place in the set or just adds noise. State the differentiator and the variant's identity becomes self-evident.

