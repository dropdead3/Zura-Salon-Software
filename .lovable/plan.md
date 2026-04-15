

## Add Subtle Stroke to Appointment Cards in Light Mode

### Problem
In light mode, appointment cards using category palette colors have no border/outline — just a left accent border. This makes them appear flat against the grid, especially when adjacent cards share similar hues.

### Solution
Add a 1px border in a darker shade of the card's category color, only in light mode. The `deriveLightModeColor()` utility already computes a `stroke` value (20% darker than the fill) — we just need to use it.

### Changes

**File: `src/components/dashboard/schedule/AppointmentCardContent.tsx`**

In the `cardStyle` memo (lines 566-579), when `useCategoryColor && !isDark` (light mode with category color):

1. Import `deriveLightModeColor` from `@/utils/categoryColors`
2. Compute the stroke color from the boosted background hex
3. Add `borderColor`, `borderWidth: '1px'`, and `borderStyle: 'solid'` to the style object — but preserve the existing `borderLeftWidth: '4px'` and `borderLeftColor` for the left accent

Updated style block for the light-mode category color branch:
```typescript
if (useCategoryColor) {
  const boostedBg = boostPaleCategoryColor(catColor.bg);
  const boostedText = boostedBg !== catColor.bg ? getContrastingTextColor(boostedBg) : catColor.text;
  const lightTokens = deriveLightModeColor(boostedBg);
  return {
    backgroundColor: boostedBg,
    color: boostedText,
    borderColor: lightTokens.stroke,
    borderWidth: '1px',
    borderStyle: 'solid' as const,
    borderLeftColor: lightTokens.stroke,
    borderLeftWidth: '4px',
    boxShadow: 'none',
    opacity: 1,
    backdropFilter: 'none',
  };
}
```

This gives each card a subtle, harmonious outline derived from its own palette — purple cards get a darker purple stroke, blue cards get a darker blue stroke, etc.

### Files Modified
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — import + ~5 lines changed in `cardStyle` memo

