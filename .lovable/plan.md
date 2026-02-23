
## Fix Batch Bar Corner Radius

### Problem
The sticky batch action bar at the bottom of the appointments Card has square corners, which visually breaks through the parent Card's `rounded-xl` border radius. This is visible in dark mode where the bar's background extends past the card's rounded bottom corners.

### Solution
Add `rounded-b-xl` to the batch bar container in `AppointmentBatchBar.tsx`. This matches the Card's `rounded-xl` so the bar's bottom corners align perfectly with the card boundary.

### File Changed

**`src/components/dashboard/appointments-hub/AppointmentBatchBar.tsx`** (line 90)

Add `rounded-b-xl` to the bar's container div:

```
Current:  "sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur px-4 py-2 flex items-center justify-between gap-3"
Updated:  "sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur px-4 py-2 flex items-center justify-between gap-3 rounded-b-xl"
```

This is a single-class addition that ensures the batch bar's bottom corners respect the card container's border radius.
