

## Remove Redundant "Requires Color/Chemical" Toggle

### Problem
The "Requires Color/Chemical" toggle inside the expanded service detail is redundant with the main tracking toggle. Enabling tracking already means the service requires color/chemical. The inner toggle just creates confusion and an extra click.

### Solution
Remove the "Requires Color/Chemical" toggle from the expanded detail panel. The main row tracking toggle becomes the single gate. When tracking is enabled, `is_chemical_service` is automatically set to `true` with default container `['bowl']`. When tracking is disabled, both flags are cleared.

### Changes

**`src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

1. **Update `toggleTracking` mutation** (lines 169–176): When `tracked: true`, also set `is_chemical_service: true` and default `container_types: ['bowl']`. When `tracked: false`, also set `is_chemical_service: false` and `container_types: []`.

2. **Remove the "Requires Color/Chemical" toggle block** (lines 746–760): Delete the entire `<div>` containing the label and Switch for `is_chemical_service`.

3. **Keep the Vessels selector**: The vessel picker (Bowls/Bottles) remains visible whenever `is_backroom_tracked` is true (since `is_chemical_service` will always be in sync). Update its visibility condition from `service.is_chemical_service` to `service.is_backroom_tracked` (or just always show it in the expanded panel since it's already gated by tracking).

4. **Update the "Reset Configuration" action** (lines ~967–995): Already clears both flags — no change needed.

### What Stays
- Main tracking toggle in the list row (the single gate)
- Vessel picker (Bowls/Bottles)
- Billing Method section
- All existing badges and status indicators
- The `is_chemical_service` column in the DB (just kept in sync automatically)

