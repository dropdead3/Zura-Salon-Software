## Problem

In the Hero "Text & Buttons Color" panel (and every other native `<input type="color">` in the website editor), the operator gets a blank rainbow picker. There's no way to say "use the same color as the See Offer button" without eyedropping the live preview and typing a hex by hand. Result: drift away from the theme palette every time someone touches a color.

The site editor already has a good pattern for this — `SectionBackgroundColorPicker` (used for per-section backgrounds) shows **None / Theme tokens / Brand presets / Custom**. The Hero text/button picker just never adopted it. The Promo Popup editor has its own `ACCENT_PRESETS` row. Same need, three implementations.

## Solution

Create one shared swatch picker, `<ThemeAwareColorInput>`, that wraps the existing native input + hex field with a row of clickable swatches sourced from **the colors actually in use on this site right now**. Then swap the four ad-hoc native pickers in the website editor over to it.

Swatch sources (in priority order, deduped by hex):

1. **Theme tokens** — resolved live from CSS vars on `<html>`: `--primary`, `--accent`, `--secondary`, `--muted`, `--foreground`, `--background`, `--card`, `--oat`. These already drift with the active website theme (Cream Lux, Zura, Rosewood, etc.), so picking "Primary" auto-matches whatever the operator chose in Site Design.
2. **In-use overrides** — read from the same draft `site_settings` the editor is editing:
   - Promo popup `accentColor` (the literal "See Offer" chip color)
   - Announcement bar background / text
   - Hero section-level `text_colors.*` (headline, subheadline, primary/secondary button bg/fg)
   - Per-section `background_color` overrides set via `SectionBackgroundColorPicker`
   Each swatch is labeled with where it came from ("See Offer", "Announcement", "Hero CTA") so the operator knows exactly what they're matching.
3. **Brand presets** — keep the existing curated neutrals (Ivory, Sand, Taupe, Graphite, Onyx, Porcelain) as a fallback row.
4. **Custom** — current native picker + hex input, unchanged.

Active state matches by resolved hex, not by string equality, so picking the "See Offer" swatch and the popup's actual hex both light up the same chip.

## Files to add

- `src/components/dashboard/website-editor/inputs/ThemeAwareColorInput.tsx` — the shared component. Same chip-row visual language as `SectionBackgroundColorPicker` so the editor feels uniform.
- `src/hooks/useInUseSiteColors.ts` — single hook that reads the draft `site_settings` for the current org and returns a deduped, labeled list of in-use hexes. Memoized; recomputes when any source setting changes so freshly-edited colors appear in the swatch row immediately.
- `src/lib/themeTokenSwatches.ts` — pure helper that reads the eight CSS vars off `document.documentElement` via `getComputedStyle` and returns `{ key, label, hex }[]`. Re-runs on a `MutationObserver` watching `<html>`'s `class` / `data-theme` attribute so theme swaps refresh swatches without a page reload.
- `src/components/dashboard/website-editor/inputs/ThemeAwareColorInput.test.tsx` — Vitest covering: theme swatches render, in-use swatches render with labels, clicking a swatch fires `onChange` with the resolved hex, custom hex still works, active state matches by resolved color.

## Files to edit

- `src/components/dashboard/website-editor/HeroTextColorsEditor.tsx` — replace the local `ColorRow` with `<ThemeAwareColorInput>`. This is the screen in the user's screenshot.
- `src/components/dashboard/website-editor/SectionStyleEditor.tsx` — swap its native picker.
- `src/components/dashboard/website-editor/AnnouncementBarContent.tsx` — swap its native picker.
- `src/components/dashboard/website-editor/SiteDesignPanel.tsx` — swap its native picker.
- `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx` — keep `ACCENT_PRESETS` (those are intentional brand suggestions) but replace the bare native input below them with `<ThemeAwareColorInput>` so operators can also pull from the active theme / hero CTA color.
- `src/components/dashboard/website-editor/inputs/SectionBackgroundColorPicker.tsx` — refactor to consume `useInUseSiteColors` and `themeTokenSwatches` so its theme/preset rows stay in sync with the new shared source of truth (no UI change for the operator).

## Doctrinal hooks (per project conventions)

- **Single ownership** — `ThemeAwareColorInput` is the only place native `<input type="color">` is allowed in `src/components/dashboard/website-editor/**` going forward. Add a scoped `no-restricted-syntax` doctrine via the existing `defineScopedDoctrine` helper in `eslint.config.js` banning `JSXOpeningElement[name.name='input'][attributes.*.name.name='type'][attributes.*.value.value='color']` outside the owner file. Backed by a banned fixture under `src/test/lint-fixtures/` and an assertion in `lint-config-resolution.test.ts` (matches the existing 5-part canon — invariant + Vitest + ESLint + fixture + meta-test).
- **Memory entry** — add `mem://style/theme-aware-color-input` describing the canon and add a one-liner to `mem://index.md` Memories so future surfaces don't re-roll their own swatch grid.

## Out of scope (deliberate)

- No change to how colors are stored — every swap still writes a `#RRGGBB` (or empty string) to the same setting key, so no migration and no risk to live sites.
- No new color theme. The "in-use" row reflects what the operator already configured; it doesn't invent palette suggestions.
- Promo popup `ACCENT_PRESETS` row stays as-is — those are brand-suggested accents, distinct from "colors already in use".
