
## Role Dashboard Configurator — Settings Surface + Multi-Role Resolution

### The two questions, answered

**Q1: Where does the Account Owner configure each role's dashboard?**
A new settings page at `/dashboard/admin/dashboards` ("Role Dashboards") that lists every role used in the org and lets the owner enter "edit mode" for any one of them. Edit mode = same `DashboardCustomizeMenu` drawer we already ship, but pre-armed with the chosen role (it routes writes to `dashboard_role_layouts` for that role, exactly as it does today when the owner uses View As).

**Q2: A user has multiple roles. Combine? Toggle? What's correct?**

Three options were considered against the doctrine ("Silence is meaningful. One primary lever. Persona scaling. No noise."):

| Option | Verdict |
|---|---|
| **Combine layouts** (union of sections from all assigned roles) | **Rejected.** Violates persona scaling — exposes manager/admin complexity to a stylist who happens to also hold an assistant role. Produces noisy, deduped sections with no clear authoring story (which role's order wins?). Owner can no longer reason about "what does a stylist see." |
| **Auto-pick highest-priority role** (current behavior) | **Keep as default.** Deterministic, governed, single source of truth. Already implemented via `pickPrimaryRoleKey` in `useDashboardLayout`. |
| **User-controlled toggle between assigned roles** | **Add on top of #2** — only visible to users with 2+ roles, and only between roles they actually hold. Persists per user. |

**Decision: Never combine. Default to highest-priority role. Multi-role users get a lightweight role switcher in the dashboard header.** Each role's dashboard remains independently authored by the Account Owner — no merging, no dilution.

This mirrors how View As already works structurally; we're just exposing a constrained version of that mechanism to the end user when they legitimately wear multiple hats.

---

### What gets built

**1. New settings page: Role Dashboards**
- Route: `admin/dashboards` (gated by `manage_settings` + `useIsPrimaryOwner`)
- Lists every distinct role present in the org (from `useOrganizationRoles`)
- Each row: role badge + name, "Last edited [date] by [user]" (from `dashboard_role_layouts.updated_at/updated_by`), "Edit dashboard" button
- "Edit dashboard" enters View-As for that role and opens the customize drawer — reusing the existing authoring path. No duplicate UI.
- Add a sidebar link under Operations Hub > Dashboards (or wherever Access Hub / Stylist Levels sit) so it's discoverable without going through View As.

**2. Multi-role user experience**
- New hook `useUserDashboardRole()` returns `{ assignedRoles, activeRole, setActiveRole }`. Only exposes a switcher when `assignedRoles.length >= 2`.
- Active role is persisted to `user_preferences.active_dashboard_role` (new nullable column). Falls back to `pickPrimaryRoleKey` when null/unset.
- New small component `DashboardRoleSwitcher` rendered in the dashboard header next to the user's name — only visible when the user has 2+ roles. A pill dropdown ("Viewing as: Stylist ▾"). Selecting a different role updates `activeRole` and re-resolves the layout.
- `useDashboardLayout` resolves layout in this priority order:
  1. Account Owner's personal override (existing)
  2. **`activeRole` from user prefs** (new) → load `dashboard_role_layouts` for that role
  3. `pickPrimaryRoleKey(roles)` (existing fallback)
  4. Role template / DEFAULT_LAYOUT (existing)
- Single-role users see no switcher and no behavior change.

**3. Schema**
- Add `active_dashboard_role app_role NULL` to `user_preferences`. RLS unchanged (user owns their row). A trigger validates the chosen role is one the user actually holds (`user_roles` lookup) — if not, NULL it out. This prevents stale preferences after a role is revoked.

---

### Doctrine alignment

- **Persona scaling preserved:** A stylist sees the stylist dashboard, period. Holding a second role means they can switch — never see both at once.
- **Owner authority preserved:** The owner remains the sole author of every role layout. Users only choose *which* authored layout to view.
- **Stylist Privacy Contract preserved:** Switching to a "stylist" role still renders only the stylist-allowed sections from `dashboard_role_layouts.role='stylist'`. The contract gates content by the active role's layout, not by the union of held roles.
- **Settings discoverability:** Owners no longer need to enter View As to find role authoring — they can do it from a settings page that lists all roles in one place.

---

### Files (technical)

- `src/pages/dashboard/admin/RoleDashboards.tsx` — new settings page
- `src/App.tsx` — route registration (`admin/dashboards`, gated)
- `src/components/dashboard/SidebarNavContent.tsx` — sidebar entry under Settings/Operations Hub
- `src/hooks/useUserDashboardRole.ts` — new hook (assignedRoles, activeRole, setActiveRole, persists to user_preferences)
- `src/components/dashboard/DashboardRoleSwitcher.tsx` — new pill dropdown, conditionally rendered
- `src/components/dashboard/DashboardLayout.tsx` (or wherever the dashboard header lives) — slot the switcher
- `src/hooks/useDashboardLayout.ts` — extend resolution to honor `activeRole` from prefs
- Migration: add `active_dashboard_role` column + validation trigger on `user_preferences`

---

### Out of scope (deferred, with triggers)

- Combining/merging dashboards across roles — **explicitly rejected** by doctrine; do not revisit unless persona scaling is overhauled.
- A dedicated "view comparison" mode (side-by-side stylist vs manager) — defer until a real owner asks for it.
- Per-location dashboard variants — separate concern; revisit when location-scoped overrides land.
