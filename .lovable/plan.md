

## Three-Level Card Depth System

The screenshot confirms the problem: the Services/Retail tiles sit inside the hero section (which is already `bg-card-inner`), but they use the same `bg-card-inner` shade -- no visible separation at level 3.

### Depth Architecture

```text
Dark mode lightness:
┌─────────────────────────────────────────┐  bg-card         (11%)
│  ┌───────────────────────────────────┐  │  bg-card-inner   (8%)
│  │  ┌─────────┐  ┌─────────┐        │  │  bg-card-inner-deep (5%)
│  │  │Services │  │ Retail  │        │  │
│  │  └─────────┘  └─────────┘        │  │
│  └───────────────────────────────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │  bg-card-inner   (8%)
│  │ Trans.  │ │AvgTicket│ │Rev/Hour │   │
│  └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────┘
```

### Changes

**1. `src/index.css` -- Add `--card-inner-deep` variable + utility class**

8 new variable declarations (4 themes x light/dark):

| Theme | Light `--card-inner-deep` | Dark `--card-inner-deep` |
|-------|--------------------------|--------------------------|
| Cream | `40 15% 90%` | `0 0% 5%` |
| Rose  | `350 10% 90%` | `350 3% 5%` |
| Sage  | `145 8% 90%` | `145 3% 5%` |
| Ocean | `210 10% 90%` | `210 3% 5%` |

Plus a new utility:
```css
.bg-card-inner-deep {
  background-color: hsl(var(--card-inner-deep));
}
```

**2. `src/lib/design-tokens.ts` -- Add `card.innerDeep` token**

```typescript
card: {
  wrapper: 'rounded-xl',
  inner: 'bg-card-inner rounded-lg border border-border/40',
  innerDeep: 'bg-card-inner-deep rounded-lg border border-border/40',  // NEW
}
```

**3. `src/components/dashboard/AggregateSalesCard.tsx` -- Services/Retail tiles**

Lines 750 and 768: Change `bg-card-inner` to `bg-card-inner-deep` on the Services and Retail tiles, since they're nested inside the hero section which is already `bg-card-inner`.

These are the only two instances that need the deep level -- the Transactions/Avg Ticket/Rev/Hour tiles sit directly inside the outer card (level 2, correctly `bg-card-inner`).

### What stays the same

All other `bg-card-inner` usages remain unchanged -- they're all level 2 (directly inside a parent card). The triple-nesting only occurs in the AggregateSalesCard hero section where Services/Retail are nested inside it.

### Scope

- `src/index.css` -- 8 new variable lines + 3-line utility class
- `src/lib/design-tokens.ts` -- 1 new token
- `src/components/dashboard/AggregateSalesCard.tsx` -- 2 class string changes

