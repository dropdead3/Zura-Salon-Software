

## Lighten Nested Cards (Cards Within Cards)

Good eye for depth hierarchy. The screenshot shows the dark mode Sales Overview where subcards (Services, Retail, Transactions, Avg Ticket, Rev/Hour) blend too closely with the parent card background. The fix introduces a dedicated `--card-inner` CSS variable that's slightly lighter than `--card` in dark mode and slightly tinted in light mode, giving nested elements a clear visual lift.

### Current Problem

Nested cards use an inconsistent mix of:
- `bg-muted/30` (barely visible in dark mode)
- `bg-background/50 dark:bg-muted/20` (too dark, blends with parent)
- `bg-muted/30 dark:bg-card` (same as parent card -- no depth at all)

In dark mode, `--card` is `0 0% 11%` and `--muted` is `0 0% 20%`, so `bg-muted/30` only reaches about 14% lightness -- nearly invisible against the 11% card.

### Solution

**1. Add `--card-inner` CSS variable to every theme** (`src/index.css`)

For each theme's light and dark variants, add a new variable that sits between `--card` and `--muted`:

| Theme | Light `--card-inner` | Dark `--card-inner` |
|-------|---------------------|---------------------|
| Cream | `40 20% 95%` (slightly warm tint) | `0 0% 15%` (4% lighter than card) |
| Rose | `350 20% 96%` | `350 10% 16%` |
| Sage | `145 15% 95%` | `145 8% 16%` |
| Ocean | `210 20% 96%` | `210 10% 16%` |

**2. Add design token** (`src/lib/design-tokens.ts`)

Add to the `card` token group:
```typescript
card: {
  wrapper: 'rounded-xl',
  inner: 'bg-card-inner rounded-lg border border-border/40',  // NEW
  iconBox: '...',
  // ...
}
```

**3. Register the Tailwind utility** (`src/index.css`)

Add a utility class `.bg-card-inner` that references the new variable:
```css
.bg-card-inner {
  background-color: hsl(var(--card-inner));
}
```

**4. Update the AggregateSalesCard subcards** (`src/components/dashboard/AggregateSalesCard.tsx`)

Replace the inconsistent background classes on nested stat tiles with the new `bg-card-inner` class. The primary targets are:
- Services / Retail subcards (lines 750, 768): `bg-background/50 dark:bg-muted/20` → `bg-card-inner`
- Transactions / Avg Ticket / Rev/Hour tiles (lines 809, 828, 847, 872, 893, 912): `bg-muted/30 dark:bg-card` → `bg-card-inner`
- Tips / Monthly Goal nested stat (line 931): `bg-muted/30 dark:bg-card` → `bg-card-inner`

### Technical Detail

The CSS variable approach ensures:
- Every theme (Cream, Rose, Sage, Ocean) gets a tuned value automatically
- Dark mode gets meaningful visual lift (11% → 15% lightness)
- Light mode gets a subtle warm tint that differentiates from the parent card
- No hardcoded dark-mode overrides needed per component
- Future nested cards just use `tokens.card.inner` or `bg-card-inner`

### Scope

- `src/index.css` -- Add `--card-inner` to 8 theme blocks (4 themes × light/dark) + utility class
- `src/lib/design-tokens.ts` -- Add `card.inner` token
- `src/components/dashboard/AggregateSalesCard.tsx` -- Update ~10 subcard class strings

No new dependencies. No schema changes. Purely visual refinement.

