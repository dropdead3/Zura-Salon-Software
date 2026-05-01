## Problem

When you upload a dark background image to the Hero section, the dark theme text and dark buttons disappear because the Hero always uses `text-foreground` / `bg-foreground` regardless of what's behind it. The slide rotator has a small auto-contrast helper (forces white text when any background image is set), but:

- The static Hero (no slides) ignores it entirely.
- Auto-contrast can't be overridden — operators have no way to pick a specific brand color or fix edge cases (light photos with bright sky, mid-tone images, etc).
- Buttons have no color control at all.

## Solution

Two layers, working together.

### 1. Smart auto-contrast (default behavior)

Apply the existing slide-rotator pattern to the static Hero too. Whenever `background_type !== 'none'` and a `background_url` is set, the Hero automatically switches to a light text palette (white headline, white-80% subhead, white-on-black primary button, white-outline secondary button). No operator action required — the most common case (uploaded photo) just works.

### 2. Explicit color overrides (operator control)

A new "Text & Buttons" panel inside the Hero editor (under Background Media) that lets the operator pin specific colors when auto-contrast isn't right:

- Headline color
- Subheadline / muted color
- Primary button — background, text, hover background
- Secondary button — border, text, hover background
- Reset button (clears all overrides → back to auto-contrast)

Each input is a color picker + hex field, matching the pattern in `SectionStyleEditor`. Empty / unset = inherit auto-contrast.

Per-slide overrides follow the same shape but default to "inherit from section" so multi-slide heroes can keep one global look or vary per slide.

### Visual layout

```text
┌─ HERO SECTION EDITOR ──────────────────┐
│ [Background Media]                     │
│   Section Background  [image preview]  │
│   Fit  [Cover] [Contain]               │
│   Overlay Darkness  ────●──── 0.4      │
│                                        │
│ [Text & Buttons]               ← NEW   │
│   ▸ Auto-contrast active               │
│     (text turns white on dark photos)  │
│                                        │
│   Headline color    [■] #ffffff   [×]  │
│   Subhead color     [■] #ffffffcc [×]  │
│                                        │
│   Primary button                       │
│     Background     [■] #ffffff    [×]  │
│     Text color     [■] #000000    [×]  │
│   Secondary button                     │
│     Border         [■] #ffffff    [×]  │
│     Text color     [■] #ffffff    [×]  │
│                                        │
│   [Reset all colors]                   │
│ [Hero Slides]                          │
│ [Hero Section content...]              │
└────────────────────────────────────────┘
```

### Doctrine compliance

- **Persona scaling**: defaults stay smart, advanced overrides stay opt-in — solo operators never need to think about it; multi-location operators get fine control.
- **Silence is valid**: empty overrides render nothing different — no "Custom" badge spam unless a value is actually set.
- **Live preview**: overrides flow through the existing `usePreviewBridge` so changes appear instantly in the iframe without saving.

## Technical changes

### Schema (`src/hooks/useSectionConfig.ts`)

Add to `HeroConfig` and `HeroSlide`:

```ts
text_colors: {
  headline?: string;        // hex, empty = auto
  subheadline?: string;
  primary_button_bg?: string;
  primary_button_fg?: string;
  primary_button_hover_bg?: string;
  secondary_button_border?: string;
  secondary_button_fg?: string;
  secondary_button_hover_bg?: string;
};
```

Default = `{}` (empty object → auto-contrast wins). Slides use `text_colors` with the same fields, all empty = inherit from section.

### Editor (`src/components/dashboard/website-editor/`)

- New file `HeroTextColorsEditor.tsx` — color-picker grid with section-level + per-slide modes.
- Wire into `HeroEditor.tsx` between `HeroBackgroundEditor` and `HeroSlidesManager`.
- Add a per-slide collapsible "Text & Buttons (override section)" inside `HeroSlidesManager.tsx`'s `SlideRow`.

### Renderers

- `src/components/home/HeroSection.tsx`: derive `hasMediaBackground`, compute auto-contrast tones, then layer overrides via inline `style={{ color: ... }}` on the headline / subheadline / button containers. Auto-contrast applies only when override is empty.
- `src/components/home/HeroSlideRotator.tsx`: replace hard-coded `text-white` / `text-black` with the same merge logic — `slide.text_colors[X] ?? config.text_colors[X] ?? autoContrastDefault`.
- Use inline styles (not Tailwind classes) for the override values since hex picks can't be expressed as utility classes. Keep Tailwind classes for the auto-contrast fallback to preserve hover transitions.

### Backwards compatibility

- Existing rows with no `text_colors` field → treated as `{}` → auto-contrast kicks in. No migration needed (jsonb shape).
- `DEFAULT_HERO` adds `text_colors: {}` so the dirty-state hook doesn't false-fire on first load.

## Out of scope

- Global theme overrides at the Site Design level (those already exist via `SiteDesignPanel`).
- Adding the same control to non-Hero sections — happy to follow up in a separate change if you want it for `BrandStatement`, `FooterCTA`, etc.
- Eyedropper / "pick color from image" tooling. Operators can use any external picker on their photo and paste the hex.
