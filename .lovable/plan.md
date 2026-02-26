

## Refactor Top Performers Card for Intelligent Responsiveness

### What Changes

Re-architect each performer row from a single horizontal flex line into a 3-zone stacked layout that degrades gracefully at narrower widths, with avatar visibility toggled by breakpoint.

### Breakpoint Strategy (Tailwind-aligned)

Since Tailwind's built-in breakpoints don't include 1200px or 1440px, we'll use the closest native breakpoints plus one custom approach:

| Your Spec | Tailwind Equivalent | Behavior |
|-----------|-------------------|----------|
| ≥ 1440px | `2xl:` (1536px) — close enough, or custom `min-[1440px]:` | Full horizontal, avatar visible, inline split |
| 1200–1439px | `xl:` (1280px) | Avatar visible, split moves below |
| 900–1199px | `lg:` (1024px) | Avatar hidden, stacked 3-row layout |
| < 900px | `md:` and below | Same stacked layout, increased spacing |

For precision, we'll use `@container` queries or Tailwind arbitrary breakpoints (`min-[1200px]:`, `min-[900px]:`) to match your exact spec. However, since this card lives inside a flex column that's narrower than the viewport, **container queries** are more accurate. We'll use Tailwind's native breakpoints as the pragmatic approach since the card's container width roughly tracks viewport width.

### Technical Changes

**File: `src/components/dashboard/sales/TopPerformersCard.tsx`**

Each performer row (lines 201–257) gets restructured:

**Current structure:**
```
[Rank] [Avatar] [Name ——— Revenue]
                [progress bar      ]
                [service · retail   ]
```

**New structure at compact widths (< `xl`):**
```
Row 1: [Rank] [Name]          [Revenue]
Row 2: [service · retail breakdown     ]
Row 3: [progress bar                   ]
```

**At wide widths (`xl`+):**
```
Row 1: [Rank] [Avatar] [Name] [Revenue]
Row 2:                 [progress bar   ]
Row 3:                 [service·retail ]
```

**Specific changes:**

1. **Avatar visibility**: Wrap `<Avatar>` in `hidden xl:block` — completely removed from layout below 1280px

2. **Row layout restructure**: Change the inner content div from a single `flex items-center` to a stacked layout:
   - Top row: `flex items-center justify-between` with name (left, truncate) and revenue (right, `whitespace-nowrap shrink-0`)
   - Below: progress bar at full width
   - Below: service/retail split

3. **Revenue protection**: Add `whitespace-nowrap` and `min-w-[80px] text-right` to the revenue `BlurredAmount` wrapper to prevent wrapping or compression

4. **Spacing increase**: Change `space-y-2` on the performer list to `space-y-3` for better visual separation between rows

5. **Progress bar**: Already full-width within content envelope — no change needed, just ensure it's in its own row below the name/revenue line

### Layout Code (Performer Row)

```tsx
<motion.div
  key={performer.user_id}
  className={cn(
    "p-2.5 rounded-lg bg-card-inner",
    styles.row
  )}
>
  <div className="flex items-start gap-3">
    {/* Rank badge - always visible */}
    <span className={cn(
      "w-7 h-7 rounded-full flex items-center justify-center font-display text-xs shrink-0 mt-0.5",
      styles.badge
    )}>
      {rank}
    </span>

    {/* Avatar - hidden below xl */}
    <Avatar className="h-9 w-9 shrink-0 hidden xl:flex mt-0.5">
      <AvatarImage ... />
      <AvatarFallback ...>{initials}</AvatarFallback>
    </Avatar>

    {/* Content zone */}
    <div className="flex-1 min-w-0">
      {/* Row 1: Name + Revenue */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-medium truncate">{performer.name}</p>
        <BlurredAmount className="font-display text-sm shrink-0 whitespace-nowrap">
          {formatCurrencyWhole(displayValue)}
        </BlurredAmount>
      </div>

      {/* Row 2: Progress bar */}
      <div className="h-1 w-full bg-primary/15 rounded-full overflow-hidden">
        <motion.div ... />
      </div>

      {/* Row 3: Service · Retail split */}
      {showSplit && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
          ...
        </div>
      )}
    </div>
  </div>
</motion.div>
```

### Files Changed

| File | Action |
|------|--------|
| `src/components/dashboard/sales/TopPerformersCard.tsx` | Restructure performer rows into 3-zone layout, add avatar breakpoint visibility, protect revenue from wrapping, increase row spacing |

### What Does NOT Change

- Card header layout
- Sort dropdown
- View all toggle
- Rank badge styling
- Animation behavior
- ScrollArea logic

