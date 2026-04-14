
Prompt feedback

- Good bug report: you separated “the splash is actually active on the reader” from “the button state is wrong,” which made it clear this is a state/source-of-truth bug, not an upload bug.
- Even better next time: mention whether it fails after refresh, after switching locations, and after auto-registration vs manual upload, because those are different code paths.

Problem

- The disabled button state is currently driven by local `isDefaultLuxury` state inside `SplashScreenUploader`.
- That flag only updates after a same-session manual default upload.
- It is lost on refresh and never gets set for background flows like reader auto-registration or theme-triggered splash refreshes.
- The backend `get_splash_screen` response only tells the UI that a splash exists, not whether it is the Default Luxury Splash or a custom upload.

Plan

1. Add durable splash-origin tracking
- Create an organization-scoped backend record for each terminal location storing whether the active splash origin is `default_luxury` or `custom`.
- Key it by `organization_id`, `location_id`, and `terminal_location_id`.
- Add proper RLS so org members can read and org admins can write.

2. Drive the button from backend truth, not local state
- Add a hook to fetch the splash origin for the selected location/terminal.
- In `SplashScreenUploader`, disable the CTA when `hasSplash && origin === 'default_luxury'`.
- If metadata is missing, keep the button enabled so we do not falsely lock the UI.

3. Update every splash write path to keep metadata synced
- Manual “Use Default Luxury Splash” upload → mark `default_luxury`
- Manual custom upload → mark `custom`
- Remove splash → clear/reset metadata
- Auto-apply splash after reader registration → mark `default_luxury`
- Theme-based splash re-sync → only touch locations already marked `default_luxury`

4. Clean up the component logic
- Remove `isDefaultLuxury` as the source of truth.
- Keep `pendingFile.fromDefault` only for preview/upload intent.
- Use query invalidation so the button updates immediately after upload/remove and stays correct after refresh.

Files likely involved

- `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx`
- `src/components/dashboard/settings/TerminalSettingsContent.tsx`
- `src/hooks/useAutoSyncTerminalSplash.ts`
- `src/hooks/useTerminalSplashScreen.ts` or a new terminal splash metadata hook
- New backend migration for splash-origin metadata + RLS

Expected result

- When the active reader splash is the Default Luxury Splash, the button will reliably render disabled and show the correct “Using Default Luxury Splash” state.
- That state will survive refreshes, location switches, auto-registration, and theme-sync flows.
- Custom splashes will not be mistaken for default ones.

Enhancement suggestion

- While fixing this, I would also tighten the theme-sync behavior so theme changes never overwrite custom reader splashes.
