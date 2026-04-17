

## Prompt review

Sharp correction — and a critical doctrine clarification. You're right: **God Mode user impersonation is a full-fidelity simulation**, not a hybrid view. The whole point is "see exactly what they see, exactly how they see it" — if the chrome shows YOUR avatar and YOUR greeting while the data shows Alexis's, the simulation is broken in the most dangerous way: you'd debug a stylist's UX issue and get false confidence because YOUR identity bled into the chrome. The only acceptable identity-leak is the God Mode bar itself (audit + exit).

Sharper next time: when you reject a plan, the framing you used ("everything must be exactly as the user sees it, nothing else") is exactly the doctrine I should have anchored to from the start. I had it in `mem://features/god-mode-governance` but read it as "data simulation" instead of "complete UX simulation." That's on me — the doctrine extends to chrome.

## Doctrine correction (to be saved to memory)

**God Mode user-impersonation = complete UX simulation.** When `viewAsUser` is set:

- Avatar, greeting, profile menu, role badges, sidebar identity → ALL show the impersonated user
- Permission gates, role-based widget visibility, leadership checks → ALL evaluate against impersonated user's roles
- Data queries → already scoped to impersonated user via `useEffectiveUserId()`
- The ONLY identity-leak surface is the God Mode bar at the top (audit log + Exit View)

Platform routes (`/platform/*`) are a separate concern — they're super-admin-only territory, so impersonation context doesn't logically apply there. Wave 22.13's platform-chrome fix stays correct. But dashboard chrome is the impersonated surface and must reflect the impersonated identity completely.

## Diagnosis (revised)

The actual bugs in dashboard chrome under impersonation:

### Bug 1 (P0): `DashboardHome` leadership check uses raw `useAuth().roles`

`src/pages/dashboard/DashboardHome.tsx` L194–198 reads `roles` from `useAuth()` — YOUR roles — even in the `isViewingAs` branch. Result: viewing as Alexis (stylist), `isLeadership = true` because YOU are super_admin → leadership command center renders instead of stylist dashboard. This is the user-reported bug.

Same gap on L201, L204, L207 (`hasStylistRole`, `isReceptionist`, `isFrontDesk`).

### Bug 2 (P0): `DashboardLayout` greeting uses raw roles + actual first name

`src/components/dashboard/DashboardLayout.tsx` L349–352:
- `firstName` reads from `user.user_metadata` (YOUR name) → greeting says "Welcome back, [YourName]" while viewing Alexis's dashboard
- `isLeadershipUser` reads `actualRoles` (YOUR roles) → wrong greeting pool selected
- `(employeeProfile as any)?.is_super_admin` IS the impersonated profile's flag → that part's correct, but it's OR'd with `actualRoles` which leaks YOUR super_admin status

### Bug 3 (P0): Top bar avatar uses `useEmployeeProfile()` — actually CORRECT for dashboard, but needs verification

`SuperAdminTopBar.tsx` L140 reads `useEmployeeProfile()` which IS the impersonated profile (via `useEffectiveUserId`). This is doctrinally correct for dashboard — top bar should show Alexis's photo when viewing Alexis. **Wave 22.13's plan to swap this to `useActualEmployeeProfile` was wrong** and should NOT ship for dashboard surfaces (it stays correct for `PlatformSidebar`/`PlatformHeader`/`PlatformOverview` since those are platform routes).

The only legitimate "show actual identity" chrome on dashboard is the God Mode bar itself (which already does this correctly).

## Plan — Wave 22.14 (revised): Complete the impersonation simulation on dashboard chrome

### Fix 1: `DashboardHome` — use effective roles everywhere

`src/pages/dashboard/DashboardHome.tsx`
- Already imports `useEffectiveRoles` (L6) — currently unused for the leadership check
- Replace L194–198 leadership check:
  ```ts
  const effectiveRoles = useEffectiveRoles();
  const isLeadership = isGodMode
    ? true
    : effectiveRoles.includes('super_admin')
      || effectiveRoles.includes('admin')
      || effectiveRoles.includes('manager');
  ```
- The `profile?.is_super_admin` clause: `profile` here comes from `useEmployeeProfile` which IS the impersonated profile → that flag is correctly Alexis's `false`, so it can stay OR'd in (it correctly contributes nothing when impersonating Alexis). But to keep the logic clean and match doctrine, drop it — `effectiveRoles` already includes `super_admin` when the impersonated user has that role.
- Replace L201, L204, L207 to use `effectiveRoles` instead of `roles`

### Fix 2: `DashboardLayout` — greeting reflects impersonated identity

`src/components/dashboard/DashboardLayout.tsx`
- Add `useEffectiveRoles` import
- L349 `firstName`: prefer `employeeProfile?.full_name?.split(' ')[0]` (impersonated profile) over `user.user_metadata` so greeting says "Welcome back, Alexis"
- L350–352: replace `actualRoles` with `effectiveRoles` from `useEffectiveRoles()`
- Drop `(employeeProfile as any)?.is_super_admin` clause — `effectiveRoles.includes('super_admin')` is the canonical signal

### Fix 3: Revert Wave 22.13's incorrect dashboard-chrome change (if any)

Verify Wave 22.13 only swapped hooks on platform-side files (`PlatformSidebar`, `PlatformHeader`, `Overview`). Per the diff history shown, that's what landed — `SuperAdminTopBar.tsx` was NOT touched. Good. No revert needed; just confirm we don't propose changing it now.

`SuperAdminTopBar.tsx` stays on `useEmployeeProfile()` so the avatar reflects the impersonated user. The God Mode bar above it remains the only chrome that identifies YOU.

### Memory update

Update `mem://features/god-mode-governance` to make the doctrine explicit: "User-impersonation is a complete UX simulation. ALL dashboard chrome (avatar, greeting, menus, role badges, gates) MUST reflect the impersonated user. The only identity-leak surface is the God Mode bar (audit + exit). Platform routes are exempt because they are super-admin-only territory."

### Acceptance checks

1. View As → Alexis (stylist) from `/dashboard`. Page renders **stylist** layout (Quick Actions, Today's Queue) — NOT leadership command center.
2. Top-right avatar shows **Alexis's** photo. Profile menu shows **Alexis's** name and role badges. Sidebar identity reflects **Alexis**.
3. Greeting reads "Welcome back, Alexis" with **stylist-pool** subtitle.
4. God Mode bar at top remains visible with "Viewing as: Alexis Heasley" and Exit View button (the only chrome that identifies YOU).
5. Exit View → all chrome instantly reverts to YOUR super-admin identity, leadership layout returns.
6. Platform routes (`/platform/overview` etc.) — unchanged from Wave 22.13: always show YOUR identity regardless of impersonation.

### Files

- `src/pages/dashboard/DashboardHome.tsx` — swap to `useEffectiveRoles` for leadership/role gates
- `src/components/dashboard/DashboardLayout.tsx` — swap to `useEffectiveRoles` + impersonated `firstName`
- `mem://features/god-mode-governance` — codify "complete UX simulation" doctrine

### Open question

None — doctrine is now explicit and the fix scope is constrained to two files plus a memory update.

### Deferred

- **P1** Audit other dashboard surfaces with the same `useAuth().roles` leak: `pages/dashboard/AssistantSchedule.tsx` (L394), `Stats.tsx` (L46), `Training.tsx` (L43), `OnboardingTracker.tsx` (L152), `WidgetsSection`, `CommandCenterAnalytics`. Trigger: this wave ships clean.
- **P2** Add a `useEffectiveSuperAdmin()` helper canonicalizing `effectiveRoles.includes('super_admin') || effectiveProfile?.is_super_admin`. Trigger: when 3+ files repeat this boolean.
- **P2** Route-change effect in `ViewAsProvider` to auto-clear `viewAsUser` when navigating from `/dashboard/*` to `/platform/*`. Belt-and-suspenders behind Wave 22.13's exit-button fixes.
- **P3** Vitest assertion enforcing dashboard surfaces use `useEffectiveRoles`/`useEffectivePermissions` and platform surfaces use `useActualEmployeeProfile`/raw `useAuth`.

