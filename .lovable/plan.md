# Plan v3 — Role Dashboard Configurator (Gap-closed build)

## Bugs and gaps found in plan v2

The deeper audit surfaced **6 real issues**, two of them blocking. Only after fixing these is the build truly correct.

---

### GAP 1 (BLOCKING): Settings can't open the Customize drawer

`DashboardCustomizeMenu` owns its `isOpen` state internally. Today's `TeamDashboardsCard` flow is:

1. Owner clicks "Preview" → sets View As → toast appears
2. Owner reads the help text: *"Open Customize Dashboard to edit this layout"*
3. Owner manually navigates to the dashboard
4. Owner finds the Customize button
5. Owner opens the drawer

That is broken UX. From a Settings page deep-link, step 3 destroys the flow. v2 inherited this bug.

**Fix:** Lift `isOpen` to a tiny global store (or a dedicated React context) so any surface — Settings, sidebar, dashboard header — can `openCustomizeDrawer({ roleKey: 'stylist' })`. Pattern: a `useCustomizeDrawer()` hook with `{ isOpen, open, close, intendedRole }`. The drawer subscribes; the role tile button calls `setViewAsRole('stylist'); openCustomizeDrawer()`. The drawer mount stays in `DashboardLayout`, but its open state becomes externally controllable.

---

### GAP 2 (BLOCKING): Pattern mismatch — `access-hub` is a route, not a Settings detail

I claimed in v2 that `access-hub` lives inside `SettingsCategoryDetail`. It does **not** — it's a dedicated page at `/admin/access-hub` (App.tsx:432), and Settings just deep-links to it. `levels` is the same: dedicated `StylistLevels` page. Pattern for governance hubs that span multiple roles:

> Dedicated route → linked from Settings card → has its own page header.

**Fix:** Create a real `RoleDashboards` page at `admin/dashboards`, register in `App.tsx` and `categoriesMap`. The Settings card click navigates there.

---

### GAP 3: Role list is hardcoded to 5 roles, ignores org's actual roles

`useTeamDashboardSummary.ts` hardcodes `TEAM_DASHBOARD_ROLES = [manager, stylist, receptionist, admin, bookkeeper]`. An org with `general_manager`, `assistant_manager`, `booth_renter`, `front_desk` won't see them. Yet `pickPrimaryRoleKey` recognizes 12+ roles.

**Fix:** Source from `useOrganizationRoles()` (created last loop). Filter to assigned roles. Sort by canonical badge order. Matches the user's earlier ask.

---

### GAP 4: `templateKeyForRole` collapses roles — UI must signal it

`templateKeyForRole()` collapses `super_admin` and `admin` → `'leadership'`. Owner customizes for `manager` → multiple roles silently share it. Today's UI shows them as separate tiles → owner expects independent layouts → confusion.

**Fix:** Group tiles by `templateKeyForRole()` output. One tile per *template key*, listing all org roles that resolve to it ("Leadership — Super Admin, Admin"). This rule also determines whether the **multi-role end-user switcher** appears: only when a user holds 2+ roles in different template-key groups.

---

### GAP 5: `dashboard_role_layouts` is keyed by `role`, not template key — schema/UI mismatch

The table has unique on `(organization_id, role)`. But seeded templates and runtime resolution use `template_key`. Writing to `role='admin'` and `role='super_admin'` creates two rows that both resolve to `'leadership'` — and at read time, the row matching the user's *primary role* wins.

**Latent bug:** an owner who customizes for `admin` and a `super_admin` user will *not* see those customizations.

**Fix (no schema change):** When the owner authors a layout for any role in a collapsed group, **mirror the write to all roles in that group**. Reset path mirrors the delete. Encapsulate in `useSaveRoleLayout` / `useResetRoleLayout`. Document the invariant. A future migration can canonicalize to template-key storage; mirroring is correct and reversible.

---

### GAP 6: Active role switching is NOT impersonation

A user voluntarily switching their own active dashboard role is not impersonation and must NOT call `setViewAsRole()` (that path triggers toasts and writes to `impersonation_logs`).

**Fix:** Introduce `useActiveDashboardRole()` as a distinct concept from View As. Two separate state surfaces, both feeding into the resolution priority in `useDashboardLayout`.

---

## Revised file plan

| File | Change | Reason |
|---|---|---|
| `src/contexts/CustomizeDrawerContext.tsx` | NEW — `{ isOpen, open(roleKey?), close }` | GAP 1 |
| `src/components/dashboard/DashboardCustomizeMenu.tsx` | Replace local `useState` with context; accept external open trigger | GAP 1 |
| `src/pages/dashboard/admin/RoleDashboards.tsx` | NEW — page rendering the role grid + Customize trigger | GAP 2 |
| `src/App.tsx` | Register `admin/dashboards` route, lazy load | GAP 2 |
| `src/pages/dashboard/admin/Settings.tsx` | Add `'role-dashboards'` to `categoriesMap`; navigate on click | GAP 2 |
| `src/hooks/useSettingsLayout.ts` | Add `'role-dashboards'` to the `team` group | GAP 2 |
| `src/hooks/useTeamDashboardSummary.ts` | Source from `useOrganizationRoles()`; group by `templateKeyForRole()` | GAP 3 + GAP 4 |
| `src/components/dashboard/TeamDashboardsCard.tsx` | Render grouped tiles; "Edit" button calls `openCustomizeDrawer()` | GAP 1 + GAP 4 |
| `src/hooks/useDashboardLayout.ts` (`useSaveRoleLayout`, `useResetRoleLayout`) | Mirror write/delete across all roles in the collapsed template-key group | GAP 5 |
| `src/hooks/useActiveDashboardRole.ts` | NEW — read/write `activeRole` inside `user_preferences.dashboard_layout` JSON, validate against held roles | GAP 6 |
| `src/hooks/useDashboardLayout.ts` (`pickPrimaryRoleKey` consumer) | Honor `activeRole` over priority fallback when valid | GAP 6 |
| `src/components/dashboard/DashboardRoleSwitcher.tsx` | NEW — pill, only renders when user holds 2+ roles in different template-key groups | GAP 4 + GAP 6 |
| `src/components/dashboard/DashboardLayout.tsx` | Slot the switcher in the header; mount the `CustomizeDrawerProvider` | GAP 1 + GAP 6 |

**No schema changes.** `user_preferences.dashboard_layout` JSON gets a new `activeRole` key; mirroring is a write-side detail.

---

## Doctrine re-check

- ✅ **Visibility Contract:** switcher returns `null` when no real choice. Settings tile group hides unassigned roles.
- ✅ **Stylist Privacy Contract:** active role drives the resolved layout; allowlist still applied at runtime.
- ✅ **Owner authority:** owners author per template-key group (mirrored to all member roles); only owners can customize.
- ✅ **State Updates:** `user_preferences` JSON writes use read-then-update.
- ✅ **Settings Navigation Uniformity:** `RoleDashboards` is a real page with `DashboardPageHeader`, matches `AccessHub` / `StylistLevels` / `CompensationHub` pattern.
- ✅ **Identity:** no hardcoded tenant strings.

---

## Memory updates after ship

- New memory: `mem://features/dashboard/role-layout-authoring` documenting the template-key collapse rule, mirror-write invariant, and switcher visibility logic.
- Update `mem://architecture/stylist-privacy-contract`: add active-role switching as a user-level pivot point covered by existing enforcement anchors.

---

## What changed from v2

| v2 said | v3 says | Why |
|---|---|---|
| Render `TeamDashboardsCard` inside `SettingsCategoryDetail` | Build a real `RoleDashboards` page + Settings card links to it | v2 misread the access-hub pattern |
| Hardcoded 5-role list is fine | Source from `useOrganizationRoles()` and group by template key | Owner ask + closes silent-collapse bug |
| Just mount the existing card | Card needs grouping refactor + external drawer trigger | Two real bugs surfaced |
| Reuse View As for active role | Separate `activeRole` from View As | Audit-log + conceptual conflict |
| No schema changes (still true) | No schema changes — but mirror writes across role group | Latent bug in existing storage model |
