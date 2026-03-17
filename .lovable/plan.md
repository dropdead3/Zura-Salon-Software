
# Fix: Brand names on cards should use Termina font

Line 151 in `SupplyLibraryDialog.tsx` currently uses `font-sans` (Aeonik Pro) for brand names. Per the design system, card titles/brand names should use `font-display` (Termina).

**Change:** In `SupplyLibraryDialog.tsx` line 151, replace `font-sans` with `font-display` on the brand name `<span>`.

```diff
- <span className="text-xs font-sans font-medium text-foreground leading-tight line-clamp-2">
+ <span className="text-sm font-display font-medium text-foreground leading-tight line-clamp-2">
```

Single-line change — one file affected.
