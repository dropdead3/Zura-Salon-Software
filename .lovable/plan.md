

## Surface Tomorrow's Expected Revenue in the Closed-State Sales Overview

### What changes

**1. Update `useTomorrowRevenue` hook to support location filtering**

Add an optional `locationId` parameter so the query respects the dashboard's current location scope. Add `location_id` filter when not `'all'`.

**File:** `src/hooks/useTomorrowRevenue.ts`

**2. Enhance the compact closed-state row with tomorrow's preview**

When `allLocationsClosed` is true and `tomorrowData` has revenue > 0, append a second line (or inline element) showing tomorrow's expected revenue and appointment count.

**File:** `src/components/dashboard/AggregateSalesCard.tsx` — lines 731-738

Replace with:
```tsx
{allLocationsClosed ? (
  <div className="bg-card-inner rounded-xl border border-border/40 py-4 px-5 space-y-2">
    <div className="flex items-center gap-3">
      <Moon className="h-4 w-4 text-muted-foreground shrink-0" />
      <p className="text-sm text-muted-foreground">
        No sales activity — all {locations?.length ?? 0} locations
        {dateRange === 'yesterday' ? ' were closed yesterday' : ' are closed today'}.
      </p>
    </div>
    {tomorrowData && tomorrowData.revenue > 0 && (
      <div className="flex items-center gap-3 pl-7">
        <Clock className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground">
          Tomorrow: <BlurredAmount disableTooltip>
            <span className="text-foreground font-medium">{formatCurrency(tomorrowData.revenue)}</span>
          </BlurredAmount> expected across {tomorrowData.appointmentCount} appointment{tomorrowData.appointmentCount !== 1 ? 's' : ''}
        </p>
      </div>
    )}
  </div>
) : (
```

This keeps the collapsed card minimal but surfaces actionable forward-looking data — tomorrow's scheduled revenue and count — when there is activity on the books.

