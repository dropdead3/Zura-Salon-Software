

## Fix: Services Setup Step Completion Logic

### Problem
Line 107 in `useBackroomDashboard.ts` marks the "Services" step as complete when `trackedServices > 0` — i.e., as soon as **any** service is tracked. But tracking a service is just the first step; tracked services also need usage components mapped to be considered fully configured. The screenshot confirms: "Services" shows a green checkmark even though service tracking setup is incomplete.

### Root Cause
```typescript
// Current (line 107)
{ label: 'Services', done: h.trackedServices > 0 },
```
This only checks if services exist with `is_backroom_tracked = true`. It ignores whether those services have components configured.

### Solution
The `useBackroomSetupHealth` hook already queries `service_tracking_components` and generates a warning (`services-no-components`) when tracked services lack components. We need to expose a flag or count, then use it in the step completion check.

### Changes

**File: `src/hooks/backroom/useBackroomSetupHealth.ts`**
- Add `trackedServicesWithComponents: number` to the `SetupHealthMetrics` interface
- Compute the count of tracked services that **do** have at least one component mapped (using the existing `componentsRes` data)
- Return it in the metrics object

**File: `src/hooks/backroom/useBackroomDashboard.ts`**
- Update the Services step to require that **all** tracked services have components:
```typescript
{ label: 'Services', done: h.trackedServices > 0 && h.trackedServicesWithComponents === h.trackedServices },
```

This means the Services checkmark only appears when every tracked service has at least one usage component mapped — matching the user's expectation that "service tracking setup" means fully configured, not just toggled on.

