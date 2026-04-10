

# Remove Platform User Bypass for Zura Connect

You're absolutely right — if platform admins can toggle apps on/off per organization from the AccountAppsCard, bypassing the subscription gate is redundant and weakens the subscription as the single source of truth. The proper flow is: toggle the flag on for the org, then access works naturally.

## Changes

Three files need the `isPlatformUser` bypass removed for Connect:

### 1. `src/components/dashboard/HelpFAB.tsx` (line 24)
- **Before:** `const showChatTab = hasConnect || isPlatformUser;`
- **After:** `const showChatTab = hasConnect;`
- Remove the `isPlatformUser` import from `useAuth()` (if no longer used elsewhere in this file)

### 2. `src/components/dashboard/SidebarNavContent.tsx` (line 578)
- **Before:** `{ hrefSuffix: '/team-chat', entitled: isConnectEntitled || isPlatformUser }`
- **After:** `{ hrefSuffix: '/team-chat', entitled: isConnectEntitled }`

### 3. `src/pages/dashboard/TeamChat.tsx` (lines 25-36)
- Remove the `isPlatformUser` bypass from the entitlement gate
- Show the loading spinner and subscription gate for all users equally
- Keep the auto-select org logic (still useful for platform users navigating here after the flag is enabled)

## Result

- All Connect access is governed solely by the `connect_enabled` feature flag
- Platform admins enable access by toggling the flag in AccountAppsCard
- No special bypass paths — clean, auditable governance

