

# Sort Stylist Columns by Utilization (Most to Least Booked)

## What it does
Reorders the stylist columns in the DayView so the most-booked stylist appears on the left and the least-booked on the right. This gives an instant visual hierarchy of who's busiest.

## Approach
The sorting should happen in `DayView.tsx` since that's where `utilizationByStylist` is already computed. We'll create a sorted copy of the `stylists` prop and use it for rendering instead of the raw prop.

## Changes

### `src/components/dashboard/schedule/DayView.tsx`

Add a `sortedStylists` memo after `utilizationByStylist` that sorts the `stylists` array by utilization percentage descending:

```tsx
const sortedStylists = useMemo(() => {
  return [...stylists].sort((a, b) => {
    const aUtil = utilizationByStylist.get(a.user_id) ?? 0;
    const bUtil = utilizationByStylist.get(b.user_id) ?? 0;
    return bUtil - aUtil;
  });
}, [stylists, utilizationByStylist]);
```

Then replace all references to `stylists` in the render (header cells, column grid, appointment columns) with `sortedStylists`. This ensures columns, headers, and appointment positioning all stay aligned.

No other files need changes.

