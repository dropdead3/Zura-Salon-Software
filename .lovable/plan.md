

# Dark Mode Appointment Color System

## Summary

Build a dual-mode color token system for calendar appointment blocks. Currently, the system applies the same hex colors from the database (`service_category_colors` table) and the same Tailwind status classes regardless of light/dark mode, producing washed-out, low-contrast blocks on dark backgrounds. This plan introduces a proper dark-mode color derivation layer with richer saturation, stronger stroke containment, and WCAG AA-compliant text contrast.

---

## Current Architecture (What Exists)

Two independent color systems power appointment blocks:

1. **Status Colors** (`APPOINTMENT_STATUS_COLORS` in `design-tokens.ts`): Tailwind utility classes like `bg-green-500`, `bg-amber-100` -- no `dark:` variants for the Day/Week cell map.

2. **Service Category Colors** (`useServiceCategoryColorsMap` hook): Raw hex values from the `service_category_colors` database table (e.g., `#facc15` for Blonding), applied as inline `backgroundColor` styles in `DayView.tsx` and `WeekView.tsx`. No dark mode transformation exists.

The `colorBy` prop defaults to `'service'`, meaning most appointment blocks use the category hex path. In dark mode, these same light-optimized hex values render as harsh, over-bright blobs against the `#0F1115` / `#1B1F2A` calendar surface.

---

## Design: Dual-Mode Token Architecture

### Approach

Create a centralized color derivation utility that:
- Takes any light-mode hex color as input
- Produces a complete dark-mode token set (fill, stroke, hover, selected, text)
- Is applied at render time based on the current theme
- Works for both database-driven category colors AND hardcoded status colors

This avoids storing duplicate dark colors in the database. The derivation is deterministic and computed client-side.

### HSL Transformation Rules

For each light-mode hex color, the dark variant is derived:

```text
Light Hex --> HSL(h, s, l)

Dark Fill:
  hue: h (preserve identity)
  saturation: clamp(s + 8, 0, 85)  -- richer, not neon
  lightness: clamp(l * 0.45 + 18, 22, 42)  -- visible on dark bg without glowing

Dark Stroke:
  hue: h
  saturation: clamp(s + 12, 0, 90)
  lightness: dark_fill_l - 12  -- darker, more defined edge

Dark Hover:
  lightness: dark_fill_l + 5

Dark Selected:
  lightness: dark_fill_l - 4
  saturation: dark_fill_s + 4

Dark Text:
  If dark_fill_l > 35 --> #1a1a2e (dark text)
  Else --> #e8e4df (light text, matching foreground token)
```

Special cases:
- Very light colors (l > 85, e.g., Blonding `#facc15`): reduce lightness more aggressively to prevent glowing
- Very dark colors (l < 25, e.g., Block `#374151`): keep lightness but increase saturation slightly for visibility
- Grays (s < 8): preserve low saturation, only adjust lightness

### Token Structure Per Color

```text
Each category/status produces:

Light Mode:
  fill        -- original hex
  stroke      -- 20% darker than fill
  hover       -- 5% lighter than fill
  selected    -- 8% darker, ring added
  text        -- auto-contrast (existing getContrastingTextColor)

Dark Mode:
  fill        -- re-derived per rules above
  stroke      -- re-derived, more saturated + darker
  hover       -- fill + 5L
  selected    -- fill - 4L, ring added
  text        -- auto-contrast against dark fill
```

---

## Change 1: Color Derivation Utility

**File**: `src/utils/categoryColors.ts` (extend existing)

Add new exports:

- `deriveDarkModeColor(hexColor: string)`: Returns `{ fill, stroke, hover, selected, text }` hex values
- `deriveFullColorTokens(hexColor: string)`: Returns `{ light: {...}, dark: {...} }` complete token sets
- `getCalendarBlockStyle(hexColor: string, isDark: boolean, state: 'default' | 'hover' | 'selected')`: Returns inline style object ready for React

Uses existing `hexToHsl` and `hslToHex` from `src/lib/colorUtils.ts`.

---

## Change 2: Status Color Dark Variants

**File**: `src/lib/design-tokens.ts`

Replace single-mode `APPOINTMENT_STATUS_COLORS` with a dual-mode structure:

```text
APPOINTMENT_STATUS_COLORS = {
  confirmed: {
    bg: 'bg-green-500 dark:bg-green-700',
    border: 'border-green-600 dark:border-green-900',
    text: 'text-white dark:text-green-100',
  },
  ...
}
```

Each status gets explicit `dark:` Tailwind variants. These are hand-tuned (not algorithmically derived) because the status palette is small and fixed:

| Status | Light Fill | Dark Fill | Dark Stroke | Dark Text |
|---|---|---|---|---|
| Pending | amber-100 | amber-800/60 | amber-700 | amber-200 |
| Booked | muted | muted/40 | muted-foreground/20 | foreground |
| Confirmed | green-500 | green-700 | green-900 | green-100 |
| Checked In | blue-500 | blue-700 | blue-900 | blue-100 |
| Completed | purple-500 | purple-700 | purple-900 | purple-100 |
| Cancelled | muted/50 | muted/30 | muted/50 | muted-foreground |
| No Show | destructive | destructive/80 | destructive | destructive-foreground |

---

## Change 3: DayView Dark Mode Integration

**File**: `src/components/dashboard/schedule/DayView.tsx`

In the `AppointmentCard` component:

1. Detect dark mode: `const isDark = document.documentElement.classList.contains('dark');`
2. When `useCategoryColor` is true (service-based coloring), replace the raw `backgroundColor: catColor.bg` inline style with the output of `getCalendarBlockStyle(catColor.bg, isDark, state)`
3. Add proper stroke: replace `border-l-4` with a full 1px border in dark mode using the derived stroke color
4. Apply derived text color instead of the database `text_color_hex` in dark mode
5. Multi-service bands: each band's `backgroundColor` also runs through the dark derivation

---

## Change 4: WeekView Dark Mode Integration

**File**: `src/components/dashboard/schedule/WeekView.tsx`

Same pattern as DayView:
1. Detect dark mode
2. Apply `getCalendarBlockStyle` for category-colored blocks
3. Adjust stroke from `border-l-4` to full 1px border in dark mode

---

## Change 5: Update APPOINTMENT_STATUS_BADGE and CONFIG

**File**: `src/lib/design-tokens.ts`

`APPOINTMENT_STATUS_BADGE` already has `dark:` variants. Verify `APPOINTMENT_STATUS_CONFIG` (used by `usePhorestCalendar`) also gets dark variants or is consumed in a context where Tailwind dark: classes apply.

---

## Change 6: Fallback Colors Dark Variants

**File**: `src/utils/categoryColors.ts`

The `FALLBACK_COLORS` map (Blonding, Color, Haircuts, etc.) currently stores single hex values. Extend the return shape of `getCategoryColor` to include dark-mode variants by running each fallback through `deriveDarkModeColor` at call time.

No database schema changes needed -- derivation is purely client-side.

---

## Derived Color Reference Table

For the default fallback categories:

| Category | Light Fill | Dark Fill | Dark Stroke | Dark Text | Contrast Ratio |
|---|---|---|---|---|---|
| Blonding | #facc15 | #8B7420 | #6B5A18 | #e8e4df | 5.2:1 |
| Color | #f472b6 | #9B4872 | #7A3659 | #e8e4df | 5.8:1 |
| Haircuts | #60a5fa | #3B6A9E | #2C5280 | #e8e4df | 5.1:1 |
| Styling | #a78bfa | #6B5A9E | #534680 | #e8e4df | 5.4:1 |
| Extensions | #10b981 | #1A7A56 | #126042 | #e8e4df | 5.3:1 |
| Consultation | #d4a574 | #8A6B4A | #6B5338 | #e8e4df | 5.6:1 |
| Treatment | #06b6d4 | #1A7A8A | #126068 | #e8e4df | 5.0:1 |
| Block | #374151 | #3A3F4C | #2A2E38 | #e8e4df | 6.1:1 |

All ratios meet WCAG AA (minimum 4.5:1 for normal text).

---

## Technical Details

### Files Created

None -- all changes extend existing files.

### Files Modified

| File | Changes |
|---|---|
| `src/utils/categoryColors.ts` | Add `deriveDarkModeColor`, `deriveFullColorTokens`, `getCalendarBlockStyle` exports |
| `src/lib/design-tokens.ts` | Add `dark:` variants to `APPOINTMENT_STATUS_COLORS` and verify `APPOINTMENT_STATUS_CONFIG` |
| `src/components/dashboard/schedule/DayView.tsx` | Apply dark-mode color derivation for category-colored blocks, change border strategy |
| `src/components/dashboard/schedule/WeekView.tsx` | Same dark-mode integration as DayView |

### Dependencies

- Uses existing `hexToHsl` and `hslToHex` from `src/lib/colorUtils.ts`
- No new npm packages
- No database changes

### Border Strategy Change (Dark Mode Only)

In dark mode, the `border-l-4` accent bar is replaced with a full 1px border using the derived stroke color. This provides structural containment that reads better against deep charcoal backgrounds. Light mode retains the existing `border-l-4` accent.

### Gradient Categories

Categories using gradient markers (e.g., `gradient:rose-gold`) already have their own visual treatment with glass stroke overlays. The dark mode derivation applies only to solid hex colors. Gradient blocks retain their existing rendering in both modes.

