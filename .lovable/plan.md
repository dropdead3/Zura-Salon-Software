

## Add Required Daily Pace to Goal Tracker Status Badge

### Change

**File: `src/components/dashboard/sales/GoalTrackerCard.tsx` (lines 148-159)**

Enhance the pace badge area to include a dynamic "need $X/operating day" subtitle beneath the status label. The calculation is straightforward: `remaining / daysRemaining`.

**Current (line 158):**
```
{orgMetrics.paceStatus === 'ahead' ? 'Ahead of Pace' : orgMetrics.paceStatus === 'on-track' ? 'On Track' : 'Behind Pace'}
```

**Updated block (lines 148-159):**
```tsx
{/* Pace badge + required daily rate */}
<div className="space-y-1">
  <div className={cn(
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
    orgMetrics.paceStatus === 'ahead' && 'bg-chart-2/10 text-chart-2',
    orgMetrics.paceStatus === 'on-track' && 'bg-primary/10 text-primary',
    orgMetrics.paceStatus === 'behind' && 'bg-destructive/10 text-destructive',
  )}>
    {orgMetrics.paceStatus === 'ahead' && <TrendingUp className="w-3 h-3" />}
    {orgMetrics.paceStatus === 'on-track' && <Target className="w-3 h-3" />}
    {orgMetrics.paceStatus === 'behind' && <TrendingDown className="w-3 h-3" />}
    {orgMetrics.paceStatus === 'ahead' ? 'Ahead of Pace' : orgMetrics.paceStatus === 'on-track' ? 'On Track' : 'Behind Pace'}
  </div>
  {orgMetrics.daysRemaining > 0 && orgMetrics.target > orgMetrics.revenue && (
    <p className="text-[10px] text-muted-foreground pl-0.5">
      Need <BlurredAmount>{formatCurrencyWhole(Math.ceil((orgMetrics.target - orgMetrics.revenue) / orgMetrics.daysRemaining))}</BlurredAmount>/day to hit goal
    </p>
  )}
</div>
```

### Behavior

| State | Display |
|---|---|
| On Track, 5 days left, $8,316 remaining | `⊙ On Track` + `Need $1,664/day to hit goal` |
| Ahead of Pace, goal already exceeded | Badge only, no daily rate (condition suppressed) |
| Behind Pace, 10 days left, $12,000 remaining | `↘ Behind Pace` + `Need $1,200/day to hit goal` |

### Notes
- Uses `BlurredAmount` for privacy compliance (hide-numbers toggle)
- Uses `formatCurrencyWhole` for clean whole-dollar display
- Suppressed when goal is already exceeded (no negative values)
- No new hooks or data fetching — purely derived from existing `orgMetrics`
- ~8 lines added, 1 file

