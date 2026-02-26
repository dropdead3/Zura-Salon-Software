

## #1 Performer Premium Emphasis

### What Changes

Subtle visual elevation for the rank #1 row only — applied dynamically to whichever performer is currently ranked first (not a specific person). No new elements, no density increase.

### Technical Changes

**File: `src/components/dashboard/sales/TopPerformersCard.tsx`**

**1. Update `getRankStyles` for rank 1** (lines 32–37)

Current:
```tsx
badge: 'bg-chart-4/15 text-chart-4 border border-chart-4/30',
row: 'border-l-2 border-l-chart-4/60',
```

New:
```tsx
badge: 'bg-chart-4/15 text-chart-4 border border-chart-4/30',
row: 'border-l-2 border-l-chart-4/60 ring-1 ring-chart-4/10 shadow-sm py-0.5',
```

- `ring-1 ring-chart-4/10` — ultra-subtle accent stroke at 10% opacity (barely visible, not bright gold)
- `shadow-sm` — one tier of elevation above the default flat rows
- `py-0.5` — adds ~4px extra vertical padding to the row (stacks with existing `p-2.5`)

**2. Revenue text contrast for #1** (line 233)

Change the `BlurredAmount` wrapper to accept a conditional class:
```tsx
<BlurredAmount className={cn(
  "font-display text-sm shrink-0 whitespace-nowrap min-w-[80px] text-right",
  rank === 1 && "text-foreground"
)}>
```

For non-#1 rows, revenue inherits the default color. For #1, it gets full `text-foreground` contrast — brighter without changing size.

**3. Progress bar contrast for #1** (line 241)

```tsx
<motion.div
  className={cn(
    "h-full rounded-full",
    rank === 1 ? "bg-primary" : "bg-primary/70"
  )}
  ...
/>
```

The #1 bar stays at full primary opacity. All other bars drop to 70% — making #1 visually dominant without changing thickness or adding animation.

### What Does NOT Change

- Typography scale (no font size changes)
- Layout structure (no new elements)
- Container query breakpoints
- Avatar visibility logic
- Sort behavior
- Data shown

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/sales/TopPerformersCard.tsx` | Add ring/shadow to #1 row, brighten #1 revenue text, differentiate progress bar opacity |

