

## Fix Card Corner Clipping for Batch Bar

### Problem
The batch bar's background bleeds past the parent Card's rounded corners because the Card element does not clip its overflow. Even though `rounded-b-xl` was added to the batch bar, the Card itself allows content to extend beyond its rounded border, creating visible square corners in dark mode.

### Solution
Add `overflow-hidden` to the `<Card>` wrapping the table and batch bar in `AppointmentsList.tsx`. This lets the Card's `rounded-xl` border radius naturally clip all child content, including the batch bar.

### File Changed

**`src/components/dashboard/appointments-hub/AppointmentsList.tsx`** (line 282)

```
Current:  <Card>
Updated:  <Card className="overflow-hidden">
```

This single change ensures the Card's border radius clips all inner content (table + pagination + batch bar), eliminating the corner bleed without affecting table scrollability (the Table component has its own internal scroll wrapper).

