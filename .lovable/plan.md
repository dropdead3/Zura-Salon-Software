

## Fix Top Performers Card Header Responsiveness

### Problem
The card header has a fixed `flex items-center justify-between` row with the icon+title on the left and the Service/Retail toggle + filter badge + info tooltip on the right. At narrow widths (e.g., inside the sidebar column of the sales overview), the toggle spills out of view.

### Solution
Make the header wrap responsively using `flex-wrap` so the toggle row breaks below the title when space is tight.

**File:** `src/components/dashboard/sales/TopPerformersCard.tsx` — lines 91-113

Replace the header layout:

```tsx
const headerContent = (
  <div className="flex flex-wrap items-center justify-between gap-2 w-full">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg shrink-0">
        <Trophy className="w-5 h-5 text-primary" />
      </div>
      <CardTitle className="font-display text-sm tracking-wide">TOP PERFORMERS</CardTitle>
    </div>
    <div className="flex items-center gap-2">
      <FilterTabsList>
        <FilterTabsTrigger value="service">Service</FilterTabsTrigger>
        <FilterTabsTrigger value="retail">Retail</FilterTabsTrigger>
      </FilterTabsList>
      {filterContext && (
        <AnalyticsFilterBadge 
          locationId={filterContext.locationId} 
          dateRange={filterContext.dateRange} 
        />
      )}
      <MetricInfoTooltip description="Ranks your team by service revenue or retail sales in the selected period." />
    </div>
  </div>
);
```

Key changes:
- Add `flex-wrap` to the outer container so the right-side controls wrap below the title when the card is narrow
- Add `gap-2` for clean vertical spacing when wrapped
- Add `shrink-0` to the icon container to prevent it from collapsing

Single file, single region edit.

