

## Replace TogglePill with FilterTabs Toggle

The Actual/Expected toggle should use the same `FilterTabsList` / `FilterTabsTrigger` pattern used throughout the dashboard (e.g., ForecastingCard, ClientEngagementCard).

### Changes in `src/components/dashboard/AggregateSalesCard.tsx`

1. **Update import** — replace `TogglePill` import with `Tabs, FilterTabsList, FilterTabsTrigger` from `@/components/ui/tabs`
2. **Replace the toggle markup** (lines 1222-1232) — swap `TogglePill` for:
   ```tsx
   <Tabs value={locationRevenueView} onValueChange={(v) => setLocationRevenueView(v as 'actual' | 'expected')}>
     <FilterTabsList>
       <FilterTabsTrigger value="actual">Actual</FilterTabsTrigger>
       <FilterTabsTrigger value="expected">Expected</FilterTabsTrigger>
     </FilterTabsList>
   </Tabs>
   ```
3. **Remove unused `TogglePill` import** if no other usage remains in the file

