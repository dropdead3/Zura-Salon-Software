
Good catch doing a hard refresh — that ruled out a stale bundle and narrowed this to an access-logic mismatch.

## What I found

- `src/config/dashboardNav.ts` is already correct: Zura Connect exists in the Zura Apps nav config.
- Your current Organization (`drop-dead-salons`) does not currently have the Zura Connect feature flag enabled in the backend. The app flag present is Color Bar, not Connect.
- `src/components/dashboard/HelpFAB.tsx` shows Chat when either:
  - the Organization has Connect, or
  - the current user is a platform user
- `src/components/dashboard/SidebarNavContent.tsx` hides `/dashboard/team-chat` unless the Organization is Connect-entitled. It does not apply the same platform-user bypass.
- So: the FAB showing Chat does not necessarily mean the Organization has Connect. It can also mean your account has platform-level bypass. That would explain why Chat appears in the FAB but not in the sidebar.

## Plan

1. Align sidebar access with the actual access model
   - Update `src/components/dashboard/SidebarNavContent.tsx`
   - Change the `/dashboard/team-chat` gate from:
     - `isConnectEntitled`
   - to:
     - `isConnectEntitled || isPlatformUser`
   - This will make the sidebar match the FAB and Team Chat page behavior.

2. Fix stale sidebar layout metadata
   - Update `src/hooks/useSidebarLayout.ts`
   - Add `/dashboard/team-chat` to `DEFAULT_LINK_ORDER.apps`
   - Remove stale `/dashboard/team-chat` from `DEFAULT_LINK_ORDER.main`
   - This keeps the sidebar editor/reset logic aligned with the current IA, where Zura Connect belongs under Zura Apps.

3. Keep strict subscription behavior for regular Organization users
   - No change to the Team Chat page gate for normal users
   - Non-platform users without Connect should still remain blocked from the app
   - Platform users keep their intentional bypass for support/setup workflows

4. Verify after implementation
   - Platform user on non-entitled Organization:
     - FAB Chat visible
     - Zura Connect visible in Zura Apps
   - Regular user on non-entitled Organization:
     - no Chat tab in FAB
     - no Zura Connect nav item
   - Regular user on entitled Organization:
     - both FAB Chat and Zura Connect nav visible

## Technical details

- Root mismatch:
  - `HelpFAB.tsx`: `hasConnect || isPlatformUser`
  - `SidebarNavContent.tsx`: `/team-chat` currently checks only `isConnectEntitled`
- Relevant files:
  - `src/components/dashboard/SidebarNavContent.tsx`
  - `src/hooks/useSidebarLayout.ts`

## Important note

If you want Zura Connect to be discoverable for everyone in the sidebar, that is a different behavior: I would remove sidebar entitlement filtering for the nav item entirely and rely on the Team Chat page’s subscription gate. But based on your earlier direction to keep chat gated to the app subscription, the safest fix is parity with the current platform-user bypass model.
