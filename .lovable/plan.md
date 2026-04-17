

## Prompt review

Sharp bug report — names the surface (Platform Overview), the trigger (entered Alexis Heasley's profile via View As → clicked Exit View), the symptom (still shows "Alexis" in platform identity), and the second-order observation (Alexis's profile rendered *your* super-admin command center, suggesting the impersonation isn't actually scoping data either). That last clue is critical — it tells me View As may be visually swapping identity but not isolating the data view. Sharper next time: tell me *where* "Exit View" was clicked from (the violet GodMode bar at the top? the ViewAsPopover? Esc key?) — there are three exit paths and they hit different code. I'll diagnose all three.

## Diagnosis

Two independent bugs are colliding here.

### Bug 1: "Exit View" button on Platform routes is the WRONG exit

The screenshot shows you on `/platform/overview`. The exit affordances visible there are:

- **`GodModeBar` "Exit View"** (`src/components/dashboard/GodModeBar.tsx` L22–25) — only calls `clearSelection()` from `OrganizationContext`. This clears the **org impersonation** but does NOT touch `ViewAsContext` (the user-impersonation state).
- **`PlatformContextBanner` "Exit View"** (`src/components/platform/PlatformContextBanner.tsx` L47–50) — same bug: calls `clearSelection()` only.

Meanwhile, the actual "view as Alexis" state lives in `ViewAsContext.viewAsUser` — set by `setViewAsUser({ id, full_name, roles })` from `ViewAsPopover.tsx` L223. Neither exit button calls `clearViewAs()`.

**Result:** clicking "Exit View" from a platform surface clears org-level impersonation but leaves user-level impersonation (`viewAsUser = Alexis`) fully active. Every hook downstream that reads `useEffectiveUserId()` continues to return Alexis's UUID.

### Bug 2: Platform surfaces are reading the impersonated identity

`useEmployeeProfile()` (`src/hooks/useEmployeeProfile.ts` L17–18) is built on `useEffectiveUserId()` — which intentionally returns `viewAsUser.id` when `isViewingAsUser` is true. That's correct *for dashboard surfaces* (which is the whole point of stylist impersonation).

But `Platform Overview` uses the same hook for the greeting (`Overview.tsx` L56–60: `firstName = profile.full_name.split(' ')[0]`). The platform sidebar (`PlatformSidebar.tsx` L41) and platform header (`PlatformHeader.tsx` L37) do the same thing.

**Result:** even when a user IS validly impersonating someone for testing, the platform identity chrome (sidebar avatar, header pill, greeting) lies about *who is logged in*. Platform routes should always show the actual super-admin identity — impersonation is an organization-scoped concept and should never bleed into platform chrome.

### Why Alexis's profile showed YOUR super-admin command center

This is the same Bug 1 in reverse. When you entered Alexis's profile via View As, the page read `useEffectiveUserId() → Alexis.id` for *some* hooks but `useAuth().user.id → your.id` for others (e.g., role checks, super-admin gates, dashboard widget visibility flags). Many command-center widgets bypass `useEffectiveUserId` and check raw `useAuth()` roles or `is_super_admin` directly. So Alexis's "view" rendered your widgets because the impersonation simulation is incomplete — it swaps profile identity but doesn't simulate role downgrade.

This is a known anti-pattern (see `mem://features/god-mode-governance`) and warrants a separate audit, but it's not what we'll fix in this wave.

## Plan — Wave 22.13: Fix View As exit + isolate platform identity from impersonation

Two surgical fixes. Both are P0 (silent identity leak + broken exit affordance).

### Fix 1: Exit buttons on platform/god-mode surfaces must clear BOTH contexts

Make every "Exit View" button call BOTH `clearSelection()` (org) AND `clearViewAs()` (user/role). Belt-and-suspenders: a platform user exiting impersonation should leave a clean slate regardless of which type of impersonation they entered.

**Files:**

- `src/components/dashboard/GodModeBar.tsx` — `handleExit` calls `clearSelection()` AND `clearViewAs()` from `useViewAs()`. Also call `clearViewAs` when navigating to `/platform/overview` so route-change cleanup is automatic.
- `src/components/platform/PlatformContextBanner.tsx` — same: import `useViewAs`, call `clearViewAs()` alongside `clearSelection()`.

### Fix 2: Platform routes must show the ACTUAL signed-in user, never the impersonated user

Platform chrome (sidebar, header, overview greeting) is a super-admin surface. It must always reflect the real account. Two approaches considered:

- **Option A:** Add a `useActualEmployeeProfile()` hook that ignores `viewAsUser` and use it on platform surfaces. Surgical, no behavior change for dashboard.
- **Option B:** Auto-clear `ViewAsContext` whenever the route changes from `/dashboard/*` to `/platform/*`. Cleaner conceptually but more invasive.

Going with **Option A** — it's the minimum-change, lowest-risk fix and respects the doctrine that platform context is architecturally isolated from organization context (`mem://architecture/public-vs-private-route-isolation`, `mem://tech-decisions/platform-theme-isolation`).

**New hook:** `src/hooks/useActualEmployeeProfile.ts`
- Identical to `useEmployeeProfile()` but reads `useAuth().user.id` directly, never `useEffectiveUserId()`. Uses cache key `['employee-profile-actual', user.id]` to avoid colliding with the impersonated cache.

**Swap call sites (3 files):**

- `src/pages/dashboard/platform/Overview.tsx` L19, L56 — swap `useEmployeeProfile` → `useActualEmployeeProfile`
- `src/components/platform/layout/PlatformSidebar.tsx` L18, L41 — same swap
- `src/components/platform/layout/PlatformHeader.tsx` L3, L37 — same swap

### Acceptance checks

1. Enter View As → Alexis Heasley from a dashboard surface. Verify dashboard now shows Alexis's view (working as designed).
2. Click "Exit View" from any surface (GodModeBar, PlatformContextBanner, ViewAsPopover). Verify both `viewAsUser` AND `selectedOrganization` are cleared — the `View As` chip in ViewAsPopover should reset to "View As" (no active state).
3. Navigate to `/platform/overview` while impersonating Alexis. Verify the greeting reads "Good morning, [your-actual-first-name]" — NOT "Alexis". Verify the platform sidebar bottom-left avatar+name shows YOUR identity. Verify the platform header top-right pill shows YOUR identity and platform role badge.
4. Verify dashboard surfaces still correctly show Alexis when impersonating — no regression to the legitimate use of `useEffectiveUserId()`.
5. Verify that exiting View As from `/platform/overview` keeps you on `/platform/overview` and the page chrome immediately reflects your real identity (no stale cache — Tanstack Query keys differ between actual and effective).

### Files

- `src/hooks/useActualEmployeeProfile.ts` (new, ~30 lines)
- `src/components/dashboard/GodModeBar.tsx` (add `useViewAs` import, call `clearViewAs()` in `handleExit`)
- `src/components/platform/PlatformContextBanner.tsx` (add `useViewAs` import, call `clearViewAs()` in exit handler)
- `src/pages/dashboard/platform/Overview.tsx` (swap hook)
- `src/components/platform/layout/PlatformSidebar.tsx` (swap hook)
- `src/components/platform/layout/PlatformHeader.tsx` (swap hook)

### Open question

None — bug is fully isolated and the fix doesn't introduce architectural debate.

### Deferred

- **P1** Audit Alexis's command center actually rendering YOUR super-admin widgets — this is a separate impersonation simulation gap. Many widgets check `useAuth().roles` or `is_super_admin` directly instead of `useEffectiveRoles()`, so impersonation doesn't downgrade visibility. Trigger: this wave ships, then run a targeted audit of `WidgetsSection`, `CommandCenterAnalytics`, and any component reading `is_super_admin` to convert them to `useEffectiveRoles()` / `useEffectivePermissions()`. Tracked under `mem://features/god-mode-governance`.
- **P2** Add a route-change effect to `ViewAsProvider` that auto-clears `viewAsUser` and `viewAsRole` when navigating from a `/dashboard/*` path to a `/platform/*` path. Belt-and-suspenders defense even if a future "Exit View" button forgets to call `clearViewAs()`. Trigger: if Bug 1 reappears in any new exit-affordance surface.
- **P3** Add a Vitest assertion in `ProtectedRoute.test.tsx` (already mocks `useViewAs`) that platform routes never resolve identity through `useEffectiveUserId`. Trigger: when adding ESLint rules to enforce hook usage by route prefix.

