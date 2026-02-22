

# Dark Mode Cards: Light-Mode Color for Text and Accent Bar

## Summary

Update dark mode appointment blocks so that the **text** and **left accent bar** use the original light-mode category color (the vivid hex like #facc15, #f472b6, #60a5fa) instead of derived dark variants. The solid dark fill stays as-is. This creates the Daylite-style contrast: dark saturated background + bright category-colored text and sidebar.

## Changes

### Change 1: Update `getDarkCategoryStyle` return values

**File**: `src/utils/categoryColors.ts`

Change the `text` and `accent` properties to pass through the original hex color instead of deriving darker/lighter variants:

- `text`: Return the original `hexColor` input (the light-mode category color) instead of `#f0eff4`
- `accent`: Return the original `hexColor` input instead of the darkened HSL derivative
- `fill`, `hover`, `selected`: Keep the current solid dark derivation (unchanged)

For grays (s < 8), keep `text` as `#e8e4df` since gray-on-gray needs different treatment.

### Change 2: No view file changes needed

`DayView.tsx` and `WeekView.tsx` already apply `darkStyle.text` as `color` and `darkStyle.accent` as `borderLeftColor`. Once the utility returns the light-mode hex for those properties, both views will render correctly with no additional changes.

---

## Expected Visual Result

| Category | Dark Fill | Left Bar Color | Text Color |
|---|---|---|---|
| Blonding | dark amber solid | #facc15 (bright gold) | #facc15 (bright gold) |
| Color | deep rose solid | #f472b6 (bright pink) | #f472b6 (bright pink) |
| Haircuts | navy solid | #60a5fa (bright blue) | #60a5fa (bright blue) |
| Extensions | forest solid | #10b981 (bright green) | #10b981 (bright green) |
| Block | slate solid | #374151 (gray) | #e8e4df (warm white) |

---

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/utils/categoryColors.ts` | Update `getDarkCategoryStyle` to return `hexColor` for `text` and `accent` instead of derived values |

### No other files need changes. No new dependencies, no database changes.

