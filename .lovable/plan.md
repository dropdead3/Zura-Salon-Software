

## Dark Mode Category Colors for Forecast Bars

Both forecast bar charts (`WeekAheadForecast.tsx` and `ForecastingCard.tsx`) currently use the raw light-mode hex color for category bar fills regardless of theme. The appointment card system already uses `getDarkCategoryStyle()` from `src/utils/categoryColors.ts` which produces translucent rgba fills, strokes matching the original hex, and text colors tuned for dark backgrounds. The forecast bars should use the same system.

### What Changes

**Both files need the same pattern:**

1. Import `useDashboardTheme` and `getDarkCategoryStyle`
2. In the category bar rendering loop, when dark mode is active, use `getDarkCategoryStyle(solidColor)` to get the dark-mode fill and stroke instead of the raw hex

### File 1: `src/components/dashboard/sales/WeekAheadForecast.tsx`

- **Add imports**: `useDashboardTheme` from `@/contexts/DashboardThemeContext`, `getDarkCategoryStyle` from `@/utils/categoryColors`
- **Add hook call** inside `WeekAheadForecast`: `const { resolvedTheme } = useDashboardTheme(); const isDark = resolvedTheme === 'dark';`
- **Lines 519-554** (category bar rendering): When `isDark`, derive fill/stroke from `getDarkCategoryStyle(solidColor)` instead of using `solidColor` directly:
  ```tsx
  const darkStyle = isDark ? getDarkCategoryStyle(solidColor) : null;
  const barFill = isDark ? darkStyle!.fill : solidColor;
  const barStroke = isDark ? darkStyle!.stroke : solidColor;
  ```
  Update `fill={barFill}` on `<Bar>` and `<Cell>`, and use `barStroke` for the non-selected stroke

### File 2: `src/components/dashboard/sales/ForecastingCard.tsx`

- **Add imports**: `useDashboardTheme` from `@/contexts/DashboardThemeContext`, `getDarkCategoryStyle` from `@/utils/categoryColors`
- **Add hook call** inside the component: `const { resolvedTheme } = useDashboardTheme(); const isDark = resolvedTheme === 'dark';`
- **Lines 891-925** (category bar rendering): Same pattern as above -- derive dark-mode fill/stroke when `isDark`

### What stays the same

- "Solid" mode bars (the glass gradient) are unaffected
- Light mode category bars remain unchanged (raw hex)
- The `ServiceMixLegend` legend dots stay as-is (small dots don't need the dark treatment)
- The tooltip category dots stay as-is

### Scope

- `src/components/dashboard/sales/WeekAheadForecast.tsx` -- 2 import lines, 1 hook line, ~6 lines in category bar loop
- `src/components/dashboard/sales/ForecastingCard.tsx` -- 2 import lines, 1 hook line, ~6 lines in category bar loop

