

# Fix Transparent Overlay on Sticky Row and Column

## Problem

All sticky cells (header row, left metric column, section headers) use `bg-muted/50` -- a 50% opacity background. When scrolling, the underlying table content shows through these sticky cells, creating ugly visual overlap artifacts visible in the screenshot.

## Solution

Replace all `bg-muted/50` on sticky cells with fully opaque `bg-muted` so content scrolling underneath is completely hidden.

### Changes in `StylistLevelsEditor.tsx`

1. **Header `TableRow`** (~line 697): `bg-muted/50` to `bg-muted`
2. **Metric header cell** (~line 698): `bg-muted/50` to `bg-muted`
3. **Level header cells** (~line 703): `bg-muted/50` to `bg-muted`
4. **Section header rows** (Compensation ~744, Promotion ~789, Retention ~803): All `bg-muted/50` to `bg-muted` on both the `TableRow`, sticky `TableCell`, and spanning `TableCell`
5. **Commission/Wage sticky cells** (~lines 757, 776): `bg-muted/50` to `bg-muted`
6. **`renderMetricRow` sticky cell** (~line 641): Change fallback from `bg-muted/50` to `bg-muted`
7. **Editing row sticky cell** (~line 641): Change `bg-primary/5` to `bg-primary/10` (slightly stronger so it's also opaque enough against scrolling content)
8. **Right-edge fade gradient** (~line 151): Change `from-card` to `from-muted` so it blends with the new header background -- or keep `from-card` since data cells still use card background (keep as-is).

All non-sticky cells (data cells) remain unchanged -- they use the default `bg-card` from the container.

### Files Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx` -- ~12 class string updates (`bg-muted/50` to `bg-muted` on all sticky elements)

### No database changes.

