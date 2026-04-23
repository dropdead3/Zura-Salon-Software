## Expand Service Category Color Palette + Theme-Aligned Swatches

Goal: dramatically expand the swatch grid in the Services editor color picker, and add a curated set of "theme-aligned" gradient/solid swatches that match each of the 12 system color themes (Zura, Cream Lux, Neon, Rosewood, Rose Gold, Peach, Cognac, Jade, Sage, Matrix, Noir, Marine).

### What changes for the user

The category color picker (the popover shown in your screenshot) gets restructured into three labeled sections:

1. **Theme Palettes** (new) — 12 swatches, one per system theme. Each is a refined gradient pulled from that theme's primary/accent. Selecting one ties a category visually to the active dashboard theme.
2. **Special Styles** (existing) — keeps the current 5 designer gradients (Teal Lime, Rose Gold, Ocean Blue, Lavender Dream, Champagne).
3. **Solid Colors** (expanded) — grows from ~36 swatches to **72 swatches** (12 columns × 6 rows) covering: neutrals, warm sands, blush/rose, peach/coral, amber/cognac, jade/teal, sage/mint, ocean/marine, indigo, violet/orchid, plum, and accent brights. Tones span pale → mid → deep so each theme has matching options.

The popover gains a slightly wider footprint (12-col grid) and scrollable body so it doesn't overflow on smaller viewports.

### Technical changes

**File 1: `src/utils/categoryColors.ts`**
- Add a new `THEME_GRADIENTS` record (12 entries, keyed by `ColorTheme` id: `zura`, `cream-lux`, `neon`, `rosewood`, `orchid`, `peach`, `cognac`, `jade`, `sage`, `matrix`, `noir`, `marine`). Each entry follows the same shape as `SPECIAL_GRADIENTS` (`id`, `name`, `background`, `textColor`, `glassStroke`) and uses each theme's primary + accent HSL values to build a 135° gradient.
- Marker convention: `gradient:theme-{id}` (e.g. `gradient:theme-jade`). Extend `getGradientFromMarker()` to look up `THEME_GRADIENTS` when the id starts with `theme-`. This keeps the existing `gradient:` storage format compatible with the DB column `service_category_colors.color_hex`.

**File 2: `src/components/dashboard/settings/ServicesSettingsContent.tsx`**
- Replace the 36-color `CATEGORY_PALETTE` constant with a 72-color expanded palette organized by hue family (neutrals, sand, blush, peach, amber, cognac, jade, sage, ocean, marine, violet, orchid).
- Add a new `THEME_GRADIENT_OPTIONS` derived from `THEME_GRADIENTS`, mirroring the current `GRADIENT_OPTIONS` shape.
- In both popover render sites (lines ~795–840 and ~1200–1245), insert a new "Theme Palettes" section above "Special Styles" with the 12 theme swatches in a `grid-cols-6 gap-1.5` layout and tooltips showing the theme name.
- Change the "Solid Colors" grid from `grid-cols-6` to `grid-cols-12 gap-1` and wrap the popover body in `max-h-[420px] overflow-y-auto` so the taller content scrolls cleanly.
- Active-state ring logic (existing `ring-2 ring-primary` on selected swatch) continues to work since selection is still a single `color_hex` string.

**No DB migration needed.** All values still write to the existing `service_category_colors.color_hex` column as either a hex string or a `gradient:...` marker.

### Out of scope
- No changes to `useCategoryThemes` (preset full-organization themes) — that's a separate surface.
- No changes to the calendar rendering — `getGradientFromMarker` already handles any marker registered in the gradient maps.

### Acceptance check
- Picker shows three sections: Theme Palettes (12), Special Styles (5), Solid Colors (72).
- Selecting any swatch persists, reloads correctly, and renders on the calendar tile.
- Theme swatches visually echo the active dashboard theme (e.g. picking `theme-jade` produces a teal-jewel tile that matches the Jade theme).
