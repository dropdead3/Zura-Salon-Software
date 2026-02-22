

# Fix Dark Mode Appointment Blocks: Solid Opaque Fills

## Problem

Two bugs are causing the dark mode cards to look wrong:

1. **Derivation bug in `getDarkCategoryStyle`**: The lightness calculation uses `s` (saturation) instead of `l` (lightness): `s * 0.38 + 18`. This produces incorrect fill colors that may be too dark or too light depending on the category's saturation value rather than its actual brightness.

2. **Grid lines bleeding through**: The appointment blocks sit at the same z-level as the grid lines. Without explicit `z-index` and a guaranteed opaque background, the hourly/half-hour/quarter-hour dividers show through the card bodies.

3. **Text and accent bar colors**: When `darkStyle` is `null` (due to the derivation producing unexpected results or the condition not matching), the fallback path applies `catColor.text` (light mode text, e.g. dark gray `#1f2937`) and `catColor.bg` as `borderLeftColor` -- both light-mode values that look wrong on dark backgrounds.

## Changes

### Change 1: Fix the HSL derivation bug

**File**: `src/utils/categoryColors.ts`

In `getDarkCategoryStyle`, line 335:
```
// BEFORE (bug):
fillL = Math.max(Math.min(s * 0.38 + 18, 42), 30);

// AFTER (correct):
fillL = Math.max(Math.min(l * 0.38 + 18, 42), 30);
```

The `l` (lightness) variable from the destructured HSL parts must be used, not `s` (saturation). This single character fix corrects the entire dark palette derivation.

Additionally, the destructuring currently only captures `[h, s]` -- it needs to capture `[h, s, l]` to have `l` available for the fill calculation.

### Change 2: Ensure opaque backgrounds and proper z-index on cards

**File**: `src/components/dashboard/schedule/DayView.tsx`

Add `z-10` to the appointment card container class so it sits above grid lines. The `relative` positioning from `absolute` already creates a stacking context, but the grid lines need to be explicitly below.

**File**: `src/components/dashboard/schedule/WeekView.tsx`

Same `z-10` addition to week view appointment blocks.

### Change 3: Verify accent bar color in dark mode uses darkStyle.accent

Already correctly implemented in both views (`borderLeftColor: darkStyle.accent`). The fix in Change 1 will ensure `darkStyle` is no longer null when it shouldn't be, so this path will actually execute.

---

## Expected Results After Fix

| Category | Light Fill | Corrected Dark Fill | Dark Accent | Text |
|---|---|---|---|---|
| Blonding (#facc15, l=54) | #facc15 | ~hsl(51, 78%, 38%) solid amber | darker amber | #f0eff4 |
| Color (#f472b6, l=70) | #f472b6 | ~hsl(330, 80%, 42%) deep rose | darker rose | #f0eff4 |
| Haircuts (#60a5fa, l=68) | #60a5fa | ~hsl(213, 80%, 42%) navy | darker navy | #f0eff4 |
| Extensions (#10b981, l=40) | #10b981 | ~hsl(160, 80%, 33%) forest | darker forest | #f0eff4 |
| Block (#374151, l=27) | #374151 | ~hsl(220, 10%, 25%) slate | darker slate | #e8e4df |

---

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/utils/categoryColors.ts` | Fix line 335: `s * 0.38` to `l * 0.38`; capture `l` from destructuring on line 322 |
| `src/components/dashboard/schedule/DayView.tsx` | Add `z-10` to appointment card container for grid line occlusion |
| `src/components/dashboard/schedule/WeekView.tsx` | Add `z-10` to appointment card container for grid line occlusion |

### No new files, no database changes, no new dependencies
