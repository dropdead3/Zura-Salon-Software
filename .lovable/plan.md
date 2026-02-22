

# Dark Mode Appointment Restyle: Solid Saturated Blocks

## Summary

Replace the current glassmorphism treatment (translucent 22% opacity fills with backdrop blur) with solid, richly saturated fills inspired by the Daylite reference. The reference shows a premium macOS-native calendar aesthetic: vivid but controlled solid fills, left accent bars in a darker shade, white text, and zero transparency. This matches the Zura doctrine of "controlled, composed, high signal clarity" better than the current glass approach.

## What Changes

### Current State (Problem)

Dark mode appointment blocks use `getGlassCategoryStyle` which produces:
- 22% opacity translucent fills
- `backdrop-blur-xl` (12px frosted glass)
- 35% opacity luminous strokes
- Pastel-tinted text

This creates a soft, ethereal look -- but the reference shows the opposite: appointment blocks should be confident, solid surfaces that clearly separate from the dark background with strong color identity.

### Target State

Each appointment block in dark mode gets:
- **Fill**: Solid, re-derived hex -- richer and more saturated than light mode, not brighter. Mid-range lightness (30-45%) so they pop against the ~7-14% lightness background without glowing
- **Left accent bar**: 4px left border in a darker, more saturated shade (matching the Daylite pattern and Zura light mode convention)
- **Text**: White (#ffffff or #f0eff4) for all colored blocks -- clean, high contrast
- **Hover**: Fill lightness +4-5%
- **Selected**: Ring treatment (existing pattern)
- **No blur, no transparency**: Remove `backdrop-blur-xl` and rgba fills entirely

Light mode remains completely unchanged.

---

## Change 1: Replace Glass Style with Solid Dark Mode Style

**File**: `src/utils/categoryColors.ts`

Update `getGlassCategoryStyle` to return solid fills instead of translucent rgba values. Rename to `getDarkCategoryStyle` for clarity:

```text
getDarkCategoryStyle(hexColor: string) returns:
  fill:         solid hex, HSL-derived (preserve hue, saturation +10-15%, lightness 32-42%)
  accent:       solid hex, lightness -10 from fill, saturation +5 (for left border)
  hover:        solid hex, lightness +5 from fill
  selected:     solid hex, lightness -4 from fill
  text:         '#f0eff4' (soft white) for all colored blocks, '#e8e4df' for grays
```

HSL derivation rules:
- **Hue**: Preserve from source (identity-preserving)
- **Saturation**: `clamp(s + 12, 35, 80)` -- noticeably richer than light mode
- **Lightness**: `clamp(l * 0.38 + 18, 30, 42)` -- sits cleanly above the 7-14% background range
- **Accent bar**: Same hue, saturation +5, lightness -10 from fill
- **Grays** (s < 8): `lightness 22-28`, minimal saturation bump

This replaces both `getGlassCategoryStyle` and the previous `deriveDarkModeColor` logic for calendar use.

---

## Change 2: Update DayView Rendering

**File**: `src/components/dashboard/schedule/DayView.tsx`

1. Replace `getGlassCategoryStyle` import with `getDarkCategoryStyle`
2. Remove `backdrop-blur-xl` class from dark mode blocks
3. Restore `border-l-4` accent bar pattern in dark mode (matching the reference and light mode convention) using the derived accent color
4. Apply solid `backgroundColor` and white `color` text
5. Multi-service bands: each band gets its own solid dark fill (no blur needed)

---

## Change 3: Update WeekView Rendering

**File**: `src/components/dashboard/schedule/WeekView.tsx`

Same changes as DayView:
1. Replace glass style with solid dark style
2. Remove backdrop blur
3. Restore left accent bar
4. Solid fills with white text

---

## Per-Category Expected Dark Palette

| Category | Light Fill | Dark Fill | Dark Accent | Dark Text |
|---|---|---|---|---|
| Blonding | #facc15 | ~#7A6A22 (warm amber-brown) | ~#5C5018 | #f0eff4 |
| Color | #f472b6 | ~#9E4470 (deep rose) | ~#7A3458 | #f0eff4 |
| Haircuts | #60a5fa | ~#3868A0 (navy blue) | ~#2A5080 | #f0eff4 |
| Styling | #a78bfa | ~#6858A0 (deep violet) | ~#504080 | #f0eff4 |
| Extensions | #10b981 | ~#1C7A58 (forest green) | ~#126042 | #f0eff4 |
| Consultation | #d4a574 | ~#886A48 (warm brown) | ~#6A5236 | #f0eff4 |
| Treatment | #06b6d4 | ~#1A788A (teal) | ~#125E6A | #f0eff4 |
| Block | #374151 | ~#383E4C (slate) | ~#2A2E38 | #e8e4df |

These sit at lightness 30-42%, well above the background (7-14%) for clear separation, well below the light fills (50-90%) so they never glow.

---

## Technical Details

### Files Modified

| File | Changes |
|---|---|
| `src/utils/categoryColors.ts` | Replace `getGlassCategoryStyle` with `getDarkCategoryStyle`; solid hex returns instead of rgba; remove hex-to-rgb helper if no longer needed |
| `src/components/dashboard/schedule/DayView.tsx` | Swap glass import to solid; remove `backdrop-blur-xl`; restore `border-l-4` with dark accent color; white text |
| `src/components/dashboard/schedule/WeekView.tsx` | Same solid treatment as DayView |

### What Gets Removed

- `backdrop-blur-xl` on appointment blocks
- `rgba()` translucent fills
- Pastel text derivation (replaced with simple white)
- `getGlassCategoryStyle` function (replaced by `getDarkCategoryStyle`)

### What Stays Unchanged

- Light mode rendering (border-l-4, solid fills) -- completely untouched
- Gradient categories (rose-gold, ocean-blue, etc.) -- retain their own treatment
- Status-based coloring (Tailwind `dark:` variants in `APPOINTMENT_STATUS_COLORS`)
- `deriveDarkModeColor` and related exports (retained for non-calendar surfaces like analytics)
- All hover/selected interaction patterns

### No New Dependencies, No Database Changes

