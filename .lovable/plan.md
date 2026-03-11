

## Remove Icons from Breakdown Category Rows

Remove the icon elements from both the Services and Retail breakdown rows in `AggregateSalesCard.tsx`.

### Changes — `src/components/dashboard/AggregateSalesCard.tsx`

**Line 1053 (Services rows):** Remove `<Scissors className="w-3 h-3 text-muted-foreground shrink-0" />`

**Line 1119 (Retail rows):** Remove `<Icon className="w-3 h-3 text-muted-foreground shrink-0" />`

Two line deletions, same file. The rank number, label, amount, and percentage all remain.

