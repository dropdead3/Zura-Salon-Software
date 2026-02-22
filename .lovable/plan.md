

# Fix: Light Mode Card Styling Regression

## Problem

The dark mode `isDark` detection in DayView and WeekView reads directly from the DOM (`document.documentElement.classList.contains('dark')`) instead of using React state. This is not reactive -- when you switch themes, the DOM class updates but the appointment card components don't re-render because `isDark` isn't tied to React's rendering cycle. This causes dark mode styles (translucent fills, category-colored text) to bleed into light mode.

## Solution

Replace the raw DOM check with the `useDashboardTheme()` hook, which provides a reactive `resolvedTheme` value that triggers re-renders when the theme changes.

---

## Change 1: DayView -- Use reactive theme detection

**File**: `src/components/dashboard/schedule/DayView.tsx`

Replace:
```typescript
const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
```

With:
```typescript
// isDark is derived from the DashboardTheme context (reactive)
```

The component already receives props from its parent. We need to either:
- Import and use `useDashboardTheme()` directly in the `AppointmentBlock` sub-component, or
- Pass `resolvedTheme` as a prop from the parent Schedule page

Since `AppointmentBlock` is defined inside `DayView.tsx`, the simplest approach is to import `useDashboardTheme` and call it within the component that computes `darkStyle`.

**Specific change**: Replace `const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')` with `const { resolvedTheme } = useDashboardTheme()` and `const isDark = resolvedTheme === 'dark'`.

## Change 2: WeekView -- Same reactive fix

**File**: `src/components/dashboard/schedule/WeekView.tsx`

Same replacement: swap the DOM classList check for `useDashboardTheme().resolvedTheme === 'dark'`.

---

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Import `useDashboardTheme`, replace DOM check with reactive `resolvedTheme === 'dark'` |
| `src/components/dashboard/schedule/WeekView.tsx` | Import `useDashboardTheme`, replace DOM check with reactive `resolvedTheme === 'dark'` |

### No new files, no new dependencies, no database changes.

