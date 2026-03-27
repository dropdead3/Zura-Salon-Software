

## Auto-Expand/Collapse Service Row on Toggle

### Problem
When a user toggles a service on, they must manually click the chevron to expand the detail row. Similarly, toggling off doesn't auto-collapse. This creates unnecessary clicks.

### Changes

**File: `src/components/dashboard/color-bar-settings/ServiceTrackingSection.tsx`**

**Line 191–195 (`toggleTracking.onSuccess`)** — After query invalidation, expand or collapse the service row based on the toggle direction:

- When toggled **on** (`tracked: true`): Add the service ID to `expandedIds`
- When toggled **off** (`tracked: false`): Remove the service ID from `expandedIds`

The mutation variables are available via the second argument of `onSuccess`. Update the callback to:

```typescript
onSuccess: (_data, variables) => {
  queryClient.invalidateQueries({ queryKey: ['color-bar-services'] });
  queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
  setExpandedIds(prev => {
    const next = new Set(prev);
    if (variables.tracked) {
      next.add(variables.id);
    } else {
      next.delete(variables.id);
    }
    return next;
  });
},
```

### Result
Toggling a service on immediately reveals the configuration panel. Toggling off collapses it. Zero extra clicks needed.

