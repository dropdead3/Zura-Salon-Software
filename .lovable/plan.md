

## Add Service Category Breakdown to Services Card

### Problem
When Retail and Services cards are side-by-side (`grid-cols-2`), expanding the Retail breakdown stretches the Retail card taller, leaving empty space in the Services card. We should show the top 4 service categories in the Services card when the Retail breakdown is expanded.

### Approach
The `useRevenueByCategoryDrilldown` hook already exists and returns service categories with revenue/count/sharePercent. React Query will deduplicate the fetch since `RevenueByCategoryPanel` uses the same query key.

### Changes — `src/components/dashboard/AggregateSalesCard.tsx`

1. **Import** `useRevenueByCategoryDrilldown` at the top (already used by `RevenueByCategoryPanel`, but now needed directly).

2. **Call the hook** alongside existing data hooks (~line 266):
   ```js
   const { data: serviceCategoryData } = useRevenueByCategoryDrilldown({
     dateFrom: dateFilters.dateFrom,
     dateTo: dateFilters.dateTo,
     locationId: filterContext?.locationId,
   });
   ```

3. **Add state** for services breakdown toggle:
   ```js
   const [servicesExpanded, setServicesExpanded] = useState(false);
   ```

4. **Auto-expand services when retail expands**: Sync `servicesExpanded` to match `retailExpanded` so both breakdowns appear together, filling the space.

5. **Update Services card** (lines 1011-1027) to include a "Breakdown" toggle and an expandable section showing the top 4 service categories (sorted by revenue descending), with rank numbers, category names, amounts, and percentages — mirroring the Retail breakdown style.

### UI Output (Services card when expanded)
```text
  ✂ Services ⓘ
    $39,031.10
       83%
   Breakdown ˄
   ─────────────
   1  Hair         $22,000   56%
   2  Color        $10,000   26%
   3  Treatments    $5,000   13%
   4  Nails         $2,031    5%
```

Single file change, no new hooks or components needed.

