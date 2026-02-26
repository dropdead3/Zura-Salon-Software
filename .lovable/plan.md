

## Add cha-ching notification toggle setting

**Approach**: Extend the existing `SoundSettingsContext` with a dedicated `chaChingEnabled` flag (separate from the general sounds toggle), and gate the toast + sound in `useTodayActualRevenue.ts` behind it. Add the toggle to the existing `SoundSettingsSection`.

### 1. Extend `SoundSettingsContext` (`src/contexts/SoundSettingsContext.tsx`)

- Add `chaChingEnabled` boolean + `setChaChingEnabled` setter to the context value
- New localStorage key: `dashboard-cha-ching-enabled`, defaulting to `true`
- Same pattern as the existing `enabled` / `setEnabled`

### 2. Gate the cha-ching effect (`src/hooks/useTodayActualRevenue.ts`)

- Import `useSoundSettings` from `SoundSettingsContext`
- Read `chaChingEnabled` from the context
- Wrap the toast + `playAchievement()` call inside the existing `useEffect` with `if (!chaChingEnabled) return;` before the delta check
- Still track `prevRevenueRef` regardless (so toggling on mid-session doesn't fire a false delta)

### 3. Add toggle to Sound Settings UI (`src/components/dashboard/settings/SoundSettingsSection.tsx`)

- Read `chaChingEnabled` / `setChaChingEnabled` from `useSoundSettings()`
- Add a new row below the existing "Enable notification sounds" toggle:
  - Label: "Checkout notifications"
  - Description: "Show a cha-ching alert when a client checks out"
  - Switch bound to `chaChingEnabled` / `setChaChingEnabled`

### Files changed
- `src/contexts/SoundSettingsContext.tsx` — add `chaChingEnabled` state + localStorage persistence
- `src/hooks/useTodayActualRevenue.ts` — gate toast/sound behind `chaChingEnabled`
- `src/components/dashboard/settings/SoundSettingsSection.tsx` — add toggle row

