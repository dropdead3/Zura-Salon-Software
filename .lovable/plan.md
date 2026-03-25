

## Default Variance Threshold to 10% & Ensure Save

### Problem
The DB column defaults to 15%, but the user wants 10% as the default. The slider needs to reliably save when adjusted.

### Changes

**1. Database migration — change column default to 10**

```sql
ALTER TABLE public.services
  ALTER COLUMN variance_threshold_pct SET DEFAULT 10.0;

UPDATE public.services
  SET variance_threshold_pct = 10.0
  WHERE variance_threshold_pct = 15.0;
```

The UPDATE normalizes existing rows that still have the old default (15). Only rows matching exactly 15 are updated — any user-customized values are preserved.

**2. Frontend fallback — `ServiceTrackingSection.tsx`**

Use `10` as the fallback when `variance_threshold_pct` is null/0:

```tsx
const threshold = service.variance_threshold_pct || 10;
```

Apply this in both the `defaultValue` prop and the display `<span>`. No other changes needed — the `onValueCommit` mutation already saves correctly.

### Files Modified
- New SQL migration (default 10, bulk-update old default rows)
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (lines 706, 720)

