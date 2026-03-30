

## Collapse Sales Overview Card When All Locations Are Closed

### Problem
When all locations are closed, the Sales Overview card displays a large empty state with `py-16` padding, a moon icon, and descriptive text — taking up significant vertical space for zero-value information.

### Solution
Replace the tall empty state with a compact, single-row inline closed indicator. The card header stays as-is (it already shows a "Closed" badge), and the body collapses to a minimal height.

### Change

**File: `src/components/dashboard/AggregateSalesCard.tsx`** — Lines 731-742

Replace the current tall closed state:
```tsx
{allLocationsClosed ? (
  <div className="bg-card-inner rounded-xl border border-border/40 py-16 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 ...">
      <Moon ... />
    </div>
    <h3 className="font-display text-lg ...">All locations closed ...</h3>
    <p className="...">No sales activity — all N locations ...</p>
  </div>
) : (
```

With a compact single-line version:
```tsx
{allLocationsClosed ? (
  <div className="bg-card-inner rounded-xl border border-border/40 py-4 px-5 flex items-center gap-3">
    <Moon className="h-4 w-4 text-muted-foreground shrink-0" />
    <p className="text-sm text-muted-foreground">
      No sales activity — all {locations?.length ?? 0} locations
      {dateRange === 'yesterday' ? ' were closed yesterday' : ' are closed today'}.
    </p>
  </div>
) : (
```

This reduces the closed state from ~160px tall to ~48px — a single line with the moon icon inline, keeping the card minimal and informative without the large centered empty-state treatment.

