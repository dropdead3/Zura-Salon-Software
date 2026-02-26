

## Fix: Triplicate Cha-Ching Notifications

**Root Cause**: `useTodayActualRevenue` contains the cha-ching notification logic (toast + `addNotification` + sound). This hook is mounted by both `AggregateSalesCard` and `PinnedAnalyticsCard` simultaneously. Each instance has its own `prevRevenueRef`, so each independently detects the revenue increase and fires a separate notification — producing 3 identical entries.

**Fix**: Extract the cha-ching detection logic out of `useTodayActualRevenue` and into a **single dedicated component** that mounts once in `DashboardLayout`.

### 1. Create `src/hooks/useChaChingDetector.ts`

A new hook that:
- Subscribes to the `['today-actual-revenue']` query cache via `useQueryClient().getQueryData()`
- Tracks `prevRevenueRef` in a single place
- Fires `addNotification`, `toast.custom(ChaChingToast)`, and `playAchievement()` exactly once per revenue increase

### 2. Remove cha-ching logic from `useTodayActualRevenue.tsx`

- Delete the `useEffect` at lines 144–163 that detects revenue changes
- Remove imports: `toast`, `ChaChingToast`, `useNotificationSound`, `useSoundSettings`, `useChaChingHistorySafe`
- Remove `prevRevenueRef`
- This hook becomes purely a data-fetching hook (its proper responsibility)

### 3. Mount the detector once in `DashboardLayout.tsx`

- Call `useChaChingDetector()` inside `DashboardLayout` (which already provides `ChaChingHistoryProvider`)
- This guarantees exactly one instance regardless of how many components consume `useTodayActualRevenue`

### Files
- **Create**: `src/hooks/useChaChingDetector.ts`
- **Edit**: `src/hooks/useTodayActualRevenue.tsx` — remove notification side effects
- **Edit**: `src/components/dashboard/DashboardLayout.tsx` — mount detector hook

