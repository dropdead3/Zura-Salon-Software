## Per-Section Color Editing — Universal Coverage

### What you have today

| Surface | Color controls | How |
|---|---|---|
| Hero | Headline, subheadline, primary/secondary CTA bg+fg+border, hover bg, eyebrow | `HeroTextColorsEditor` (full granular) |
| Announcement bar | Banner bg, highlight color (auto-contrast) | `AnnouncementBarContent` |
| Promo popup | Accent color | `PromotionalPopupEditor` |
| Site Design panel | Site-wide theme palette | `SiteDesignPanel` |
| **Every other section** (Generic) | Background type/color, generic text-color override | `SectionStyleEditor` via the `Style` pill on the section card |

Every section already has *some* color control (the generic Style pill), but only Hero/Announcement/Popup expose **per-element** colors. The gap is granular tokens (heading vs. body vs. eyebrow vs. button vs. accent) for the 12 content sections.

### What's missing

Sections that render multiple distinct text elements but only expose one blanket "text override":

1. **FAQ** — section heading, eyebrow, question text, answer text, accent (open-state border/icon)
2. **Testimonials** — section heading, eyebrow, quote text, attribution, star color
3. **Footer CTA** — heading, subheading, primary button bg+fg, secondary button bg+fg
4. **Footer** (full footer) — link color, heading color, divider, social icon color
5. **New Client** — heading, body, CTA button colors
6. **Brand Statement** — heading, body, accent
7. **Brands** — section heading, eyebrow, label color
8. **Drinks** — section heading, eyebrow, item name, item description
9. **Extensions** — section heading, eyebrow, body, CTA colors
10. **Extension Reviews Chips** — chip bg, chip text, accent
11. **Popular Services** — heading, eyebrow, service-card text, price color, CTA
12. **Locations / Stylists / Services / Gallery display editors** — heading + eyebrow color
13. **Sticky Footer Bar** — bg, text, button colors

### The plan — three layers

**Layer 1 — Schema (one shared shape).** Add a `text_colors` JSON object to each section's settings, modeled after Hero's `text_colors`. Each section declares only the slots it actually has:

```ts
// shared shape, per-section keys vary
type SectionTextColors = {
  heading?: string;
  eyebrow?: string;
  body?: string;
  accent?: string;
  primary_button_bg?: string;
  primary_button_fg?: string;
  primary_button_hover_bg?: string;
  secondary_button_bg?: string;
  secondary_button_fg?: string;
  // section-specific extras (e.g. star_color for Testimonials)
};
```

Persisted at `site_settings.<section_key>.text_colors`. Empty = inherit from theme. No DB migration — `site_settings.value` is JSONB, so this is purely a settings-payload addition.

**Layer 2 — One canonical reusable editor.** Build `SectionTextColorsEditor` (mirrors `HeroTextColorsEditor`) that takes a `slots` config + `value` + `onChange`. It renders one labeled `ThemeAwareColorInput` per slot, so every section-specific editor wires it in 5 lines. Reuses the existing theme-token swatch row, "in-use" swatch row, custom hex picker, and auto-contrast logic from the canon — no new color-picker code.

**Layer 3 — Wire it into each section editor.** For each of the 12 editors above:
- Import `SectionTextColorsEditor`, declare which slots that section supports.
- Add a "Section Colors" group (collapsible, matches the "Banner Color" group's styling in `AnnouncementBarContent`).
- Pass `formData.text_colors` ↔ `handleChange('text_colors', next)` through the existing dirty-state hook.
- Inject `auto-contrast hover defaults` (the same fallback already used on Hero) so operators can't ship illegible hover states.

**Layer 4 — Live render.** Each `home/<Section>.tsx` component reads `text_colors` from its settings hook and applies inline `style={{ color: ... }}` to the matching elements (or via CSS variables on the section root). Mirrors the Hero pattern verbatim — same tone-fallback resolver, same `pickReadableForeground` helper, same auto-contrast for hover states.

### Order of work

1. **Foundation** — extract `SectionTextColorsEditor` from `HeroTextColorsEditor` into `inputs/SectionTextColorsEditor.tsx`. Pure refactor: Hero keeps its existing shape; the new component takes a `slots` array.
2. **Wave 1 (highest-traffic sections)** — FAQ, Testimonials, Footer CTA, Brand Statement.
3. **Wave 2** — Brands, Drinks, Extensions, Extension Reviews Chips, New Client, Popular Services.
4. **Wave 3** — Locations, Stylists, Services, Gallery display editors + Footer (full) + Sticky Footer Bar.

Each wave: editor → live component → quick visual verify in the editor preview.

### Guardrails carried forward

- Auto-contrast hover fallback (already canon for Hero) applied to every new `*_hover_bg` slot — operator can't ship a light hover bg with dark text below 4.5:1.
- `useDirtyState` wired against `text_colors` so the Save bar activates correctly (we just hardened this on 11 editors — same pattern reused).
- Live-edit bridge (`usePreviewBridge`) carries the new payload to the iframe with no extra plumbing — it streams the whole formData object.
- Theme-aware swatches resolve against the **website** theme, not the dashboard theme (per ThemeAwareColorInput Canon).
- "In-use" swatch aggregator (`useInUseSiteColors`) gets new sources added so colors picked in section A appear as one-click chips in section B.

### What this does NOT do

- No new global theme tokens — operators still paint via the existing 12 site themes. This adds *per-section overrides on top* of the theme.
- No per-element color editing for *Hero* — Hero already has it; this brings the rest of the site to parity.
- No element-level overrides inside structural editors that don't render text (e.g. Hero Background Editor, Gallery image grid).

### Estimated scope

~14 editor files touched, ~12 home-section render files touched, 1 new shared input component, 1 update to `useInUseSiteColors`. No DB migration. No breaking changes — empty `text_colors` = current behavior.

After approval I'll implement Foundation + Wave 1 in the first pass and stop for review before touching Waves 2–3, since this is a wide change and you'll want to QA the visual treatment on a couple sections before I roll the same pattern across all twelve.