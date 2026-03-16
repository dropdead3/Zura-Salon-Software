

# Default All Locations Selected

## Change
In `BackroomPaywall.tsx` line 54, change the initial state from an empty `Set` to pre-populated with all active location IDs.

Since `activeLocations` depends on async data, use a `useEffect` to set the default once locations load:

```typescript
// After activeLocations is derived (~line 67), add:
useEffect(() => {
  if (activeLocations.length > 0 && selectedLocationIds.size === 0) {
    setSelectedLocationIds(new Set(activeLocations.map(l => l.id)));
  }
}, [activeLocations]);
```

This seeds all locations as selected on first load, while still allowing users to toggle them off. The guard `selectedLocationIds.size === 0` prevents re-selecting all if the user has manually deselected some.

**File**: `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

