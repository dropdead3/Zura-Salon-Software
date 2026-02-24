

## Fix: Match Tips Card Border to Sibling Cards

### Problem

The Tips card in the right sidebar has a brighter/more visible border than its sibling cards (Top Performers and Revenue Breakdown). This is because:

- **Top Performers**: `border-border/40`
- **Revenue Breakdown**: `border-border/40`
- **Tips card**: `border-border` (full opacity -- 2.5x brighter)

### Fix

**File: `src/components/dashboard/AggregateSalesCard.tsx` (line 1000)**

Change the Tips card's outer border class from `border-border` to `border-border/40` to match the sibling cards:

```
// Before
<Card className="bg-card/80 backdrop-blur-xl border-border">

// After
<Card className="bg-card/80 backdrop-blur-xl border-border/40">
```

This is a single-line class change. No logic or layout changes needed.

