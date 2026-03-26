

## Fix: BackroomSetupBanner crash — undefined `steps`

### Root Cause
`BackroomSetupBanner` expects a `SetupHealthData` shape with `steps`, `isComplete`, `completed`, and `total` fields. But it receives raw `SetupHealthMetrics` from `useBackroomSetupHealth` (cast via `as any`), which has none of those fields. `setupHealth.steps` is `undefined`, so `.map()` crashes.

### Solution
Derive the banner-specific shape from `SetupHealthMetrics` inside `BackroomSettings.tsx` before passing it to the banner. This keeps the hook's return type unchanged and creates the `steps` array from the existing health data.

### Changes

**File: `src/pages/dashboard/admin/BackroomSettings.tsx`**
- Add a `useMemo` that transforms `health` (SetupHealthMetrics) into the `SetupHealthData` shape:
  - `steps`: derived from key configuration sections (Products, Services, Formulas, Allowances, Stations, Alerts) using the existing `getSectionStatus` helper
  - `isComplete`: all steps done
  - `completed` / `total`: counts from the steps array
  - `warnings`: passed through directly from `health.warnings`
- Pass the derived object to `<BackroomSetupBanner>` instead of `health as any`

| File | Change |
|------|--------|
| `src/pages/dashboard/admin/BackroomSettings.tsx` | Add `useMemo` to derive `SetupHealthData` from `SetupHealthMetrics`; remove `as any` cast |

