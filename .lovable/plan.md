

## Increase Interior Card Border Opacity by +10%

The interior/sub-card borders use opacity modifiers on `border-border`. The primary sources are:

1. **Design tokens** (`src/lib/design-tokens.ts`, lines 74-76): `border-border/40` → `border-border/50` for `card.inner` and `card.innerDeep`
2. **Widespread component usage**: Many components use `border-border/30` for interior dividers and row separators — these should become `border-border/40`. Components using `border-border/40` should become `border-border/50`. Components using `border-border/50` should become `border-border/60`.

### Changes

**File: `src/lib/design-tokens.ts`**
- Line 74: `border-border/40` → `border-border/50` (card.inner)
- Line 76: `border-border/40` → `border-border/50` (card.innerDeep)
- Line 194: `border-border/40` → `border-border/50` (drilldown header)
- Line 198: `border-border/40` → `border-border/50` (drilldown footer)

**Bulk find-and-replace across ~200 component files** for interior border classes:
- `border-border/20` → `border-border/30`
- `border-border/30` → `border-border/40`
- `border-border/40` → `border-border/50`
- `border-border/50` → `border-border/60`

This cascading +10% shift applies to all interior card borders, separators, dividers, and sub-card outlines across the entire dashboard. The outer card borders (which use full `border-border` without opacity) are unaffected.

