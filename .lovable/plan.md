

# Dark Mode Appointment Glassmorphism Restyle

## Summary

Replace the current solid-fill dark mode appointment block rendering with a luxury glassmorphism treatment. Instead of opaque re-derived fills, dark mode blocks will use translucent category-colored backgrounds at 22% opacity, backdrop blur, and a thin 1px luminous stroke at 35% opacity -- preserving semantic color identity while feeling architectural and premium against deep charcoal calendar surfaces.

---

## What Changes

### Current State (Problem)

Dark mode appointment blocks use `deriveDarkModeColor()` which produces solid, opaque fills (e.g., `#8B7420` for Blonding). These read as heavy, flat blobs on dark backgrounds -- functional but not luxurious. No translucency, no depth, no glass containment.

### Target State

Each appointment block in dark mode gets:
- **Fill**: Category hex at 22% opacity (e.g., `rgba(250, 204, 21, 0.22)` for Blonding)
- **Blur**: `backdrop-blur-xl` (12px) for frosted glass depth
- **Stroke**: Category hex at 35% opacity, 1px, creating a luminous containment edge
- **Text**: Pastel-tinted variant of category color for legibility (e.g., warm cream for gold-family, soft pink for rose-family)
- **Hover**: Opacity lifts to 30% on fill, stroke brightens to 45%
- **Selected**: Ring treatment with category color at 50% opacity

Light mode remains completely unchanged.

---

## Change 1: New `getGlassCategoryStyle` Utility

**File**: `src/utils/categoryColors.ts`

Replace `deriveDarkModeColor` usage with a new `getGlassCategoryStyle` function:

```text
getGlassCategoryStyle(hexColor: string) returns:
  fill:       rgba(r, g, b, 0.22)    -- translucent category color
  stroke:     rgba(r, g, b, 0.35)    -- luminous edge containment
  hoverFill:  rgba(r, g, b, 0.30)    -- lifted on hover
  hoverStroke: rgba(r, g, b, 0.45)   -- brighter edge on hover
  selectedFill: rgba(r, g, b, 0.18)  -- slightly deeper
  text:        pastel tint derived from category hue
```

**Text color derivation**: Convert hex to HSL, then produce a pastel tint:
- Hue: preserve from category
- Saturation: 25-35% (soft, not washed)
- Lightness: 82-88% (readable on dark translucent bg)
- Exception: grays/neutrals use `hsl(var(--foreground))` equivalent

This function returns CSS inline style objects, not Tailwind classes, since the category colors are dynamic hex values from the database.

---

## Change 2: Update DayView Dark Mode Rendering

**File**: `src/components/dashboard/schedule/DayView.tsx`

In the `AppointmentCard` component:

1. Replace `deriveDarkModeColor` import with `getGlassCategoryStyle`
2. Replace `darkTokens` memo to call `getGlassCategoryStyle(catColor.bg)` instead
3. Update the inline style block for dark + category color:
   - `backgroundColor` uses the translucent rgba fill
   - `borderColor` uses the luminous rgba stroke
   - `borderWidth: '1px'`, `borderStyle: 'solid'` (unchanged)
   - `color` uses the pastel tint text
4. Add `backdrop-blur-xl` class when dark + category color is active (via `cn()`)
5. Multi-service bands: each band gets its own translucent fill (no blur on individual bands -- blur applies to the parent container only)

---

## Change 3: Update WeekView Dark Mode Rendering

**File**: `src/components/dashboard/schedule/WeekView.tsx`

Same pattern as DayView:
1. Replace `deriveDarkModeColor` with `getGlassCategoryStyle`
2. Apply translucent fills, luminous strokes, pastel text
3. Add `backdrop-blur-xl` class conditionally for dark mode category blocks
4. Multi-service bands: translucent fills per band

---

## Change 4: Retain `deriveDarkModeColor` for Non-Calendar Use

**File**: `src/utils/categoryColors.ts`

Keep `deriveDarkModeColor`, `deriveLightModeColor`, `deriveFullColorTokens`, and `getCalendarBlockStyle` as-is. They may be used by other surfaces (analytics, legends). The new `getGlassCategoryStyle` is specifically for calendar appointment blocks.

---

## Visual Specification

### Against Calendar Backgrounds

```text
Primary bg:  #0F1115   (hsl 225, 16%, 7%)
Surface:     #151821   (hsl 225, 18%, 11%)
Card:        #1B1F2A   (hsl 225, 20%, 14%)

Appointment block (e.g., Blonding #facc15):
  Fill:    rgba(250, 204, 21, 0.22)  -- warm gold wash
  Stroke:  rgba(250, 204, 21, 0.35)  -- luminous gold edge
  Text:    hsl(45, 30%, 85%)         -- soft warm cream
  Blur:    12px backdrop

Result: The block reads as "gold" without being a bright blob.
It has depth (blur), containment (stroke), and identity (hue).
```

### Per-Category Dark Glass Palette

| Category | Light Fill | Glass Fill (22%) | Glass Stroke (35%) | Pastel Text |
|---|---|---|---|---|
| Blonding | #facc15 | rgba(250,204,21,0.22) | rgba(250,204,21,0.35) | hsl(45, 30%, 85%) |
| Color | #f472b6 | rgba(244,114,182,0.22) | rgba(244,114,182,0.35) | hsl(330, 35%, 85%) |
| Haircuts | #60a5fa | rgba(96,165,250,0.22) | rgba(96,165,250,0.35) | hsl(213, 30%, 86%) |
| Styling | #a78bfa | rgba(167,139,250,0.22) | rgba(167,139,250,0.35) | hsl(255, 30%, 87%) |
| Extensions | #10b981 | rgba(16,185,129,0.22) | rgba(16,185,129,0.35) | hsl(160, 28%, 84%) |
| Consultation | #d4a574 | rgba(212,165,116,0.22) | rgba(212,165,116,0.35) | hsl(30, 28%, 85%) |
| Treatment | #06b6d4 | rgba(6,182,212,0.22) | rgba(6,182,212,0.35) | hsl(188, 30%, 85%) |
| Block | #374151 | rgba(55,65,81,0.22) | rgba(55,65,81,0.35) | foreground token |

---

## Technical Details

### Files Modified

| File | Changes |
|---|---|
| `src/utils/categoryColors.ts` | Add `getGlassCategoryStyle` export; hex-to-rgba conversion helper |
| `src/components/dashboard/schedule/DayView.tsx` | Replace `deriveDarkModeColor` with `getGlassCategoryStyle`; add conditional `backdrop-blur-xl` |
| `src/components/dashboard/schedule/WeekView.tsx` | Same glass treatment as DayView |

### No Files Created, No Database Changes, No New Dependencies

### What Stays Unchanged

- Light mode rendering (border-l-4, solid fills)
- Gradient categories (rose-gold, ocean-blue, etc.) -- they already have their own glass treatment
- Status-based coloring (Tailwind dark: variants in `APPOINTMENT_STATUS_COLORS`)
- `deriveDarkModeColor` and related exports (retained for non-calendar surfaces)

