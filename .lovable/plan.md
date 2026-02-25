

## Remove Redundant "of $X expected" Text

The line at line 700 currently reads `$2,271.00 of $1,883.00 expected`. Since the expected amount is already shown in the badge above, the ` of $1,883.00 expected` portion is redundant.

### Change

**File: `src/components/dashboard/AggregateSalesCard.tsx` (line 700)**

Change:
```
{formatCurrency(todayActual.actualRevenue)} of {formatCurrency(displayMetrics.totalRevenue)} expected
```

To:
```
{formatCurrency(todayActual.actualRevenue)}
```

One line, no logic changes.

