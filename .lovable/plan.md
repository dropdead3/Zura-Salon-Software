

# Dark Mode Cards: Translucent Fill + Light-Mode Color Stroke and Text

## Summary

Restyle dark mode appointment blocks to use a **translucent** category-colored fill (allowing grid lines to subtly show through) with a **1px border stroke** in the original light-mode category color, plus light-mode colored text. This replaces the current solid opaque fills. The left accent bar also uses the light-mode color.

## What Changes

### Current State
- `getDarkCategoryStyle` returns solid hex fills at lightness 30-42%
- Cards use `z-10` to sit above grid lines (hiding them)
- Text and accent bar already use the original `hexColor` -- that stays

### Target State
- Fill becomes an `rgba()` value at ~18-22% opacity of the category color
- A 1px border stroke wraps the entire card in the original light-mode hex
- Text stays as the light-mode category hex
- Left accent bar stays as the light-mode category hex
- `backdrop-blur` is NOT re-added (clean translucency, not frosted glass)
- `z-10` stays for interaction layering but the translucent fill lets grid structure show through naturally

---

## Change 1: Update `getDarkCategoryStyle` to return translucent fill and stroke

**File**: `src/utils/categoryColors.ts`

Update the `DarkCategoryStyle` interface to add a `stroke` property, and change `fill` and `hover` to return `rgba()` strings instead of solid hex:

```
DarkCategoryStyle {
  fill: string;      // rgba(r, g, b, 0.18) -- translucent category color
  stroke: string;    // original hexColor -- 1px border color
  accent: string;    // original hexColor -- left bar color (unchanged)
  hover: string;     // rgba(r, g, b, 0.28) -- slightly more opaque on hover
  selected: string;  // rgba(r, g, b, 0.32) -- more opaque when selected
  text: string;      // original hexColor for colored, #e8e4df for grays (unchanged)
}
```

Implementation: Convert the hex to RGB, then return `rgba(r, g, b, 0.18)` for fill. For grays, use a slightly higher opacity (~0.22) since gray is less visible. Add a helper to convert hex to RGB components.

### Change 2: Update DayView to apply stroke as border

**File**: `src/components/dashboard/schedule/DayView.tsx`

In the dark mode style block, add `borderColor: darkStyle.stroke` and `borderWidth: '1px'` alongside the existing `borderLeftColor` and `borderLeftWidth` overrides. The left accent bar becomes 4px of the same color, so effectively:

- `border: 1px solid [light-mode hex]` on all sides
- `borderLeftWidth: 4px` for the accent bar (overrides left side to be thicker)

### Change 3: Update WeekView with the same stroke treatment

**File**: `src/components/dashboard/schedule/WeekView.tsx`

Same border/stroke application as DayView.

---

## Expected Visual Result

| Element | Value |
|---|---|
| Fill | Category color at 18% opacity (translucent, grid lines faintly visible) |
| Stroke | 1px border in full light-mode category color |
| Left bar | 4px left border in light-mode category color |
| Text | Light-mode category color (e.g., #facc15 gold, #f472b6 pink) |
| Hover | Category color at 28% opacity |
| Backdrop blur | None (clean transparency, not frosted) |

---

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/utils/categoryColors.ts` | Add `stroke` to interface; change `fill`/`hover`/`selected` to `rgba()` strings; add hex-to-RGB helper |
| `src/components/dashboard/schedule/DayView.tsx` | Apply `borderColor: darkStyle.stroke`, `borderWidth: '1px'`, keep `borderLeftWidth: '4px'` with `borderLeftColor: darkStyle.accent` |
| `src/components/dashboard/schedule/WeekView.tsx` | Same stroke/border treatment as DayView |

### No new files, no new dependencies, no database changes.

