

# Fix: Remove Redundant Progress Bar in Revenue Gap Drilldown

## Problem
The drilldown section repeats the same "Actual vs Expected" progress bar that already exists on the parent card above it. Two identical progress bars are visually redundant.

## Solution
Replace the progress bar in `RevenueGapDrilldown.tsx` with two inline text rows:
- **Scheduled Service Revenue:** showing `data.expectedRevenue`
- **Gap Revenue:** showing `data.gapAmount` (colored red/warning for negative gap, green for positive)

This gives the drilldown a text-based summary context without duplicating the visual progress bar.

## Changes

**File:** `src/components/dashboard/sales/RevenueGapDrilldown.tsx`

Replace lines 132–153 (the "Summary bar" block with the Progress component) with two simple label-value rows:

```tsx
{/* Summary context */}
<div className="space-y-1.5">
  <div className="flex items-center justify-between text-xs">
    <span className="text-muted-foreground">Scheduled Service Revenue</span>
    <BlurredAmount>
      <span className="font-medium text-foreground">
        {formatCurrency(data.expectedRevenue)}
      </span>
    </BlurredAmount>
  </div>
  <div className="flex items-center justify-between text-xs">
    <span className="text-muted-foreground">Gap Revenue</span>
    <BlurredAmount>
      <span className={cn(
        "font-medium",
        data.gapAmount <= 0 ? "text-success-foreground" : "text-warning"
      )}>
        {data.gapAmount <= 0 ? '+' : '-'}{formatCurrency(Math.abs(data.gapAmount))}
      </span>
    </BlurredAmount>
  </div>
</div>
```

The `Progress` import can be removed if no longer used elsewhere in the file.

