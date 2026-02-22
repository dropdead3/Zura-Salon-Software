
# Fix: Auto-Select Location in Add New Client Dialog

## Problem
When opening "Add New Client" without a `defaultLocationId`, the location field defaults to empty. If the user doesn't manually select a location before saving, the mutation throws "Please select a location." For organizations with a single location, this is unnecessary friction since there's only one valid choice.

## Solution
Auto-select the first available location when the locations list loads and no location is currently set. This is a single `useEffect` addition.

## Technical Change

**File:** `src/components/dashboard/schedule/NewClientDialog.tsx`

Add a `useEffect` after the existing location sync effect (around line 138) that auto-selects:

```tsx
// Auto-select location when there's only one, or pick the first if none set
useEffect(() => {
  if (!locationId && locations.length > 0) {
    setLocationId(locations[0].id);
  }
}, [locations, locationId]);
```

This ensures:
- Single-location orgs never see the error -- it's pre-selected automatically
- Multi-location orgs get the first location pre-selected, but can still change it via the dropdown
- If `defaultLocationId` is already set, this effect does nothing (since `locationId` is already populated)

One file, one small effect. No other changes needed.
