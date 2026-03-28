

## Add Zebra-Stripe Row Backgrounds for Long Lists

### Problem
With 20+ rows in the stylist breakdown (and other long lists), it's hard to track which name corresponds to which value across the wide gap. The rows visually blur together.

### Solution
Add **alternating row backgrounds** (zebra striping) to all bar-chart/ranked-list panels. Even-indexed rows get a subtle `bg-muted/15` background, odd rows stay transparent. This is the standard readability pattern for data tables.

### Changes

**1. `src/components/dashboard/sales/CategoryBreakdownPanel.tsx`**
- Add alternating background to the row `className`: `index % 2 === 0 ? 'bg-muted/15' : ''`

**2. `src/components/dashboard/sales/RevPerHourByStylistPanel.tsx`**
- Same alternating background on each stylist row

**3. `src/components/dashboard/sales/TransactionsByHourPanel.tsx`**
- Same alternating background on each hour row

**4. `src/components/dashboard/sales/TicketDistributionPanel.tsx`**
- Same alternating background on each bucket row

### Pattern applied to each row
```tsx
className={cn(
  "grid items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors",
  index % 2 === 0 && "bg-muted/15",
  // ...existing grid-cols
)}
```

### What stays the same
- Grid column structure, animations, hover states, BlurredAmount, section headers — all unchanged

