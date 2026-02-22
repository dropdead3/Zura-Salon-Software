

# Fix: Ensure Light Mode Cards Are Always Solid and Opaque

## Problem

After dark mode styling changes, light mode appointment cards can appear translucent or show wrong text colors. The root cause is that `getDarkCategoryStyle` produces `rgba()` translucent fills. If the `resolvedTheme` from `useDashboardTheme()` has any delay or mismatch during initial render, dark mode's translucent styles can leak into light mode.

Additionally, the light mode style block lacks explicit properties that would guarantee solid rendering regardless of any inherited or transitional styles.

## Solution

Harden the light mode style branch to be fully self-contained and explicitly opaque, ensuring it can never appear translucent regardless of render timing or theme detection edge cases.

---

## Change 1: Add explicit light mode properties in DayView

**File**: `src/components/dashboard/schedule/DayView.tsx` (lines 332-336)

Current light mode style:
```typescript
: useCategoryColor ? {
  backgroundColor: catColor.bg,
  color: catColor.text,
  borderLeftColor: catColor.bg,
} : {}
```

Replace with explicit, fully-qualified light mode style:
```typescript
: useCategoryColor ? {
  backgroundColor: catColor.bg,
  color: catColor.text,
  borderLeftColor: catColor.bg,
  borderWidth: '0 0 0 4px',
  borderStyle: 'solid',
  boxShadow: 'none',
  opacity: 1,
  backdropFilter: 'none',
} : {}
```

This ensures:
- `boxShadow: 'none'` clears any residual dark mode glow/ring
- `opacity: 1` guarantees fully opaque rendering
- `backdropFilter: 'none'` prevents any glassmorphism bleed
- `borderWidth`/`borderStyle` are explicit so Tailwind classes don't create conflicts

## Change 2: Same hardening in WeekView

**File**: `src/components/dashboard/schedule/WeekView.tsx` (lines 189-193)

Same replacement -- add `boxShadow: 'none'`, `opacity: 1`, `backdropFilter: 'none'`, and explicit border properties to the light mode style object.

## Change 3: Guard darkStyle with explicit null fallback

**Files**: `DayView.tsx` and `WeekView.tsx`

Add a safety check so `darkStyle` is definitively null when not in dark mode:

```typescript
const darkStyle = useMemo(() => {
  if (!isDark || !useCategoryColor || displayGradient) return null;
  return getDarkCategoryStyle(catColor.bg);
}, [isDark, useCategoryColor, displayGradient, catColor.bg]);
```

This is already correct, but we add an additional runtime guard in the style ternary: `useCategoryColor && isDark && darkStyle` instead of just `useCategoryColor && darkStyle` -- making the dark check explicit in both the memo AND the render path.

---

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/components/dashboard/schedule/DayView.tsx` | Harden light mode style with explicit opacity, boxShadow, backdropFilter; add `isDark` guard to style ternary |
| `src/components/dashboard/schedule/WeekView.tsx` | Same hardening and guard |

### No new files, no new dependencies, no database changes.

