

## Green "In Progress" Badges + Expected Revenue Styling

### Problems
1. **Badge color**: "In progress" badges use `bg-primary/10 text-primary/80` (blue) — should be green to convey "on track / expected."
2. **Amount styling**: In-progress items show `-$456.00` in red (`text-destructive/90`), identical to cancelled/no-show items. This implies a finalized gap, but these amounts are still planned to be collected.

### Changes

**File: `src/components/dashboard/sales/RevenueGapDrilldown.tsx`**

1. **Line 29** — Change badge class to green:
   ```
   badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
   ```

2. **Lines 86-90** — In the `GapItemRow` component, conditionally style the amount based on reason:
   - For `not_concluded`: render amount in muted/green (not red), without the `-` prefix, and add a small label like "expected" to clarify it's planned revenue.
   - For all other reasons: keep existing red `-$X` styling.

   ```tsx
   {item.reason === 'not_concluded' ? (
     <BlurredAmount>
       <span className="font-sans text-sm text-emerald-500/80 whitespace-nowrap shrink-0 tabular-nums">
         {formatCurrency(item.variance)} expected
       </span>
     </BlurredAmount>
   ) : (
     <BlurredAmount>
       <span className="font-sans text-sm text-destructive/90 whitespace-nowrap shrink-0 tabular-nums">
         -{formatCurrency(item.variance)}
       </span>
     </BlurredAmount>
   )}
   ```

### Result
In-progress appointments will show green badges and amounts styled as "expected to collect" rather than "lost revenue," clearly distinguishing them from actual gap items like cancellations and no-shows.

