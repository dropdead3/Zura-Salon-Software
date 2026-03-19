

# Enhance Setup Banner Header Text

## Problem
The "1 of 6 areas configured" text looks plain — just a small body text line that doesn't convey progress strength or visual hierarchy.

## Changes

**File: `BackroomDashboardOverview.tsx`** — lines 108–110

Replace the plain text with a styled fraction + label layout:

1. **Split the number from the label** — render the count ("1 of 6") using `font-display text-amber-400 text-sm tracking-wide` to give it weight and brand alignment, followed by "areas configured" in `font-sans text-muted-foreground text-xs`.

2. **Use inline-flex layout** so the two parts sit on one line with a small gap.

**From:**
```tsx
<p className={cn(tokens.body.emphasis, 'text-foreground text-sm')}>
  {setupHealth.completed} of {setupHealth.total} areas configured
</p>
```

**To:**
```tsx
<p className="flex items-baseline gap-1.5">
  <span className="font-display text-sm text-amber-400 tracking-wide">
    {setupHealth.completed} OF {setupHealth.total}
  </span>
  <span className="font-sans text-xs text-muted-foreground">
    areas configured
  </span>
</p>
```

This gives the progress fraction visual prominence using the display font with amber accent, while the descriptor text stays subtle — consistent with the brand's typographic hierarchy.

Single line group change, same file.

