

## Demo Mode Hardening — 3 Enhancements

### 1. Demo Bowl Persistence Guard

**Problem:** `useCompleteDockSession` and `useMarkDockSessionUnresolved` in `useDockSessionComplete.ts` hit the DB with `demo-session-*` IDs, causing errors. The `useCreateMixBowl` and `useUpdateBowlStatus` mutations in `useMixBowls.ts` also write to `mix_bowls` and `mix_session_events` with demo IDs. Similarly, `useDepleteMixSession` would attempt inventory depletion on fake sessions.

**Note:** `DockServicesTab` already handles bowl creation locally via `demoBowls` state — so the main risk is the session-level mutations (complete, unresolved) and any edge path where `useMixBowls` mutations get called with demo IDs.

**Fix:**
- **`src/hooks/dock/useDockSessionComplete.ts`** — Add `demo-` ID guard at the top of both `useCompleteDockSession` and `useMarkDockSessionUnresolved` mutation functions. Short-circuit with success toast.
- **`src/hooks/backroom/useMixBowls.ts`** — Add `demo-` guard in `useCreateMixBowl` and `useUpdateBowlStatus`. Return mock data without DB writes.
- **`src/hooks/backroom/useDepleteMixSession.ts`** — Add `demo-` guard to skip inventory depletion.

### 2. Demo Analytics Exclusion

**Problem:** If demo sessions ever get written to `mix_sessions` (e.g. via real-data demo path), the analytics snapshots could include them.

**Current state:** The analytics queries in `analytics-service.ts`, `useChemicalCostTrend.ts`, `useBackroomROI.ts`, and `useBackroomComplianceTracker.ts` all query `backroom_analytics_snapshots` which is populated by a scheduled snapshot job. The snapshot job queries `mix_sessions` — need to verify it filters demo data.

**Fix:**
- **`src/lib/backroom/services/analytics-service.ts`** — In the `getLatestSnapshot` and any snapshot-writing functions, add a `is_demo` filter or exclude sessions where `appointment_id` starts with `demo-`.
- **`supabase/functions/supply-intelligence/index.ts`** — The waste query already reads from `backroom_analytics_snapshots`. If the snapshot generation excludes demo data, this is clean. Add a safety `.neq('is_demo', true)` filter if the column exists, or document that demo sessions never persist to `mix_sessions` (which is true for pure demo mode since `DockServicesTab` uses local state).

**Pragmatic approach:** Since pure demo mode uses local state and never writes to `mix_sessions`, and real-data demo mode uses actual org data (which is valid analytics), the main risk is minimal. Add a comment documenting this invariant and add the `demo-` session guards (from point 1) as the primary defense.

### 3. Demo Reset Button

**Problem:** No way to reset demo state without refreshing the page. Accumulated demo bowls, location selection, and staff filter persist across tab switches.

**Fix:**
- **`src/components/dock/DockDeviceSwitcher.tsx`** — Add a `RotateCw` (reset) icon button visible only in demo mode (`isDemoMode` from `useDockDemo()`). On tap:
  - Clear `localStorage` keys: `dock-location-id`, `dock-staff-filter`
  - Emit a custom event (`dock-demo-reset`) that `DockServicesTab` listens to for clearing `demoBowls` state
  - Invalidate all dock-related query caches (`dock-appointments`, `dock-mix-sessions`, `dock-client-profile`)
  - Show toast: "Demo reset"
- **`src/components/dock/appointment/DockServicesTab.tsx`** — Add `useEffect` listener for the `dock-demo-reset` event that calls `setDemoBowls([])`.

### Files Summary

| Action | File | Change |
|--------|------|--------|
| Modify | `src/hooks/dock/useDockSessionComplete.ts` | Guard `demo-` session IDs |
| Modify | `src/hooks/backroom/useMixBowls.ts` | Guard `demo-` session IDs |
| Modify | `src/hooks/backroom/useDepleteMixSession.ts` | Guard `demo-` session IDs |
| Modify | `src/components/dock/DockDeviceSwitcher.tsx` | Add Reset Demo button |
| Modify | `src/components/dock/appointment/DockServicesTab.tsx` | Listen for reset event |

