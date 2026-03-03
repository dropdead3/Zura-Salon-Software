

## Fix: Align "All Appointments Complete" with Live Session State

The root cause is that `allAppointmentsComplete` in `AggregateSalesCard` never checks whether there are still active in-session appointments. It only looks at location closing hours and last appointment end times. Meanwhile, `LiveSessionIndicator` uses a time-window check against appointment schedule times.

### The Fix

**`src/components/dashboard/AggregateSalesCard.tsx`** (around line 480):

Add the `useLiveSessionSnapshot` hook and incorporate its `inSessionCount` into the `allAppointmentsComplete` calculation. If `inSessionCount > 0`, appointments are NOT all complete regardless of what the closing-hours logic says.

```tsx
// Add import
import { useLiveSessionSnapshot } from '@/hooks/useLiveSessionSnapshot';

// Inside the component, add:
const liveSession = useLiveSessionSnapshot(locationId);

// Modify allAppointmentsComplete memo to include liveSession.inSessionCount as a dependency:
const allAppointmentsComplete = useMemo(() => {
  if (!isToday) return false;
  
  // If anyone is still in session by time-window, revenue is not finalized
  if (liveSession.inSessionCount > 0) return false;
  
  // ... existing Path 1 (closing hours) and Path 2 (last appointment end time) logic unchanged ...
}, [isToday, locations, todayActual, liveSession.inSessionCount]);
```

This ensures the Sales Overview card cannot claim "All appointments complete" or "Final Revenue Today" while the Live Session indicator still shows stylists working. Both systems will now agree.

### Impact
- Single line gate added to existing memo
- No new queries (reuses the already-cached `useLiveSessionSnapshot` data)
- Both indicators will be consistent across the dashboard

