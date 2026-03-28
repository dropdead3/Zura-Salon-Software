

## Fix Horizontal Bar Chart Layout Across Dashboard Panels

### Problem
All horizontal bar chart panels use `flex` with `min-w` on labels, causing progress bars to start and end at different positions depending on label length. The bars are visually ragged — not professionally aligned.

### Solution
Convert each bar row from loose flex layout to a **4-column grid** so that:
- **Column 1** (label): fixed width, text truncates
- **Column 2** (progress bar): fills remaining space — all bars start and end at the same x-position
- **Column 3** (percentage or count): fixed width, right-aligned
- **Column 4** (value): fixed width, right-aligned

This ensures every progress bar is perfectly aligned regardless of label length.

### Files to Update

**1. `src/components/dashboard/sales/CategoryBreakdownPanel.tsx`**
- Change row from `flex items-center gap-3` to `grid grid-cols-[140px_1fr_48px_90px] items-center gap-3`
- Remove `min-w-[100px]` from label, add `truncate`
- Remove `w-[38px]` from percentage span
- Remove `min-w-[80px]` from value span
- Grid handles all sizing

**2. `src/components/dashboard/sales/TransactionsByHourPanel.tsx`**
- Change row to `grid grid-cols-[50px_1fr_36px] items-center gap-3` (3 columns — no percentage column)
- Remove `w-[46px]` and `w-[32px]` fixed widths
- Peak badge can be a 4th optional column or remain inline

**3. `src/components/dashboard/sales/TicketDistributionPanel.tsx`**
- Change row to `grid grid-cols-[64px_1fr_36px] items-center gap-3` (3 columns)
- Remove `w-[60px]` and `w-[32px]` fixed widths
- Sweet Spot badge as optional 4th column

**4. `src/components/dashboard/sales/RevPerHourByStylistPanel.tsx`**
- Change row to `grid grid-cols-[120px_1fr_80px] items-center gap-3` (3 columns — no percentage)
- Remove `min-w-[100px]` and `min-w-[60px]` fixed widths

### Pattern
Each row becomes:
```tsx
<motion.div
  className="grid grid-cols-[140px_1fr_48px_90px] items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
>
  <span className="text-sm text-foreground font-medium truncate">
    {entry.name}
  </span>
  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
    <motion.div ... />
  </div>
  <span className="text-xs text-muted-foreground tabular-nums text-right">
    {pct}%
  </span>
  <span className="text-sm font-display tabular-nums text-right">
    <BlurredAmount>{value}</BlurredAmount>
  </span>
</motion.div>
```

### What stays the same
- Animation (framer-motion), hover states, section headers, data hooks
- BlurredAmount wrapping on monetary values
- Badge rendering for Peak / Sweet Spot indicators

