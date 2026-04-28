
## Plan v2 — Role Dashboard Configurator (Revised after audit)

### What the codebase already has (that v1 missed)

Your codebase is **further along than my first plan assumed**. Re-using what exists is the better build:

| Asset | What it does | Status |
|---|---|---|
| `dashboard_role_layouts` table | Per-(org, role) authored layouts, RLS-gated to primary owner | ✅ Live |
| `dashboard_role_layout_audit` table | "Last edited at / by" per role | ✅ Live |
| `useTeamDashboardSummary` hook | Returns each role + `hasOverride` + `lastEditedAt` | ✅ Live |
| `TeamDashboardsCard` component | Owner-facing tile grid: each role → "Preview" → enters View As → Customize drawer routes writes to that role | ✅ Live but **orphaned** (removed from Command Center; section retired in `RETIRED_SECTION_IDS`) |
| `useSaveRoleLayout` / `useResetRoleLayout` | Already-built role-keyed mutations (separate from View-As path) | ✅ Live, currently unused by UI |
| `useDashboardLayout` resolution | Already routes via View-As role when owner is previewing | ✅ Live |
| Stylist Privacy Contract enforcement | Allowlist + forbidden pinned cards applied at runtime regardless of authored layout | ✅ Live |

**Implication:** v1 over-built. We don't need a new page, new table column, new hook, or schema change. We need to **re-home the orphaned `TeamDashboardsCard` into Settings** and **add a small multi-role switcher** for end users.

---

### Revised build (much smaller)

#### 1. Settings entry — "Role Dashboards"

- Add a new `SettingsCategory`: `role-dashboards` (icon: `LayoutDashboard`)
- Add to `SECTION_GROUPS` under the existing `team` group (Access & Visibility) in `useSettingsLayout.ts`
- Add detail view in `SettingsCategoryDetail.tsx` that renders the existing `<TeamDashboardsCard />` (which already does the right thing — sets View As, surfaces "Custom"/"Default", links to Customize)
- Owner-only: `SettingsCategoryDetail` gates by `useCanCustomizeDashboardLayouts()` (already returns `isPrimaryOwner`)
- Un-retire the orphan: leave `TeamDashboardsCard.tsx` as-is — just re-mount it inside Settings instead of the dashboard

That's it for Q1. ~20 lines of glue, no new component.

#### 2. Multi-role end-user experience

The right question is **"does this user actually have multiple meaningful dashboard-divergent roles?"** Today `pickPrimaryRoleKey` collapses on a strict priority order — silently. That's fine for 95% of users but obscures choice for the rare manager-who-also-takes-clients case.

**Decision (unchanged from v1, sharpened):**
- **Never combine.** Combining violates the Stylist Privacy Contract — a manager+stylist user combining layouts could surface manager financials inside what stylist-mode is supposed to hide. Doctrine prohibits this.
- **Default = highest-priority role** (`pickPrimaryRoleKey`, current behavior).
- **Persist the user's choice** so it's sticky across sessions (per-user preference, not per-tab).
- **Switcher only renders for users with 2+ assigned roles whose `templateKeyForRole()` resolves to *different* templates.** A user with `stylist` + `assistant` both resolve to different templates → show switcher. A user with `admin` + `super_admin` both resolve to `leadership` → no switcher (no real choice).
- **Switcher is constrained to roles the user actually holds.** Server-side validation: when reading `active_dashboard_role`, cross-check against `user_roles`. If the role was revoked, NULL it out and fall back to `pickPrimaryRoleKey`. **No new column needed** — store this inside the existing `user_preferences.dashboard_layout` JSON as `activeRole`. (Read-then-update pattern already standard for that table.)

#### 3. Schema impact

**None.** Reusing `user_preferences.dashboard_layout` JSON for `activeRole`. No migration. No trigger. No RLS changes.

The validation is a 3-line client guard:
```
if (activeRole && !userRoles.includes(activeRole)) activeRole = null;
```
Plus a server-side echo when the layout is read (already done implicitly because RLS gates `dashboard_role_layouts` reads to org members — they can read any role's layout for their org regardless).

---

### Files

| File | Change |
|---|---|
| `src/hooks/useSettingsLayout.ts` | Add `'role-dashboards'` to the `team` group |
| `src/components/dashboard/settings/SettingsCategoryDetail.tsx` | Add `'role-dashboards'` case → renders `<TeamDashboardsCard />` |
| `src/lib/iconMap` (or wherever Settings registers icons/colors) | Add icon + color for the new category |
| `src/hooks/useDashboardLayout.ts` | Read `activeRole` from `user_preferences.dashboard_layout`; honor it in `pickPrimaryRoleKey` resolution; validate against held roles |
| `src/components/dashboard/DashboardRoleSwitcher.tsx` | NEW — small pill dropdown, conditional render |
| `src/components/dashboard/DashboardLayout.tsx` | Slot the switcher in the header next to the user identity |

**No new route. No new page. No migration.** That's the entire delta.

---

### Where v1 was wrong

1. **Proposed a new `/admin/dashboards` route** — unnecessary; Settings detail view is the established pattern (`access-hub`, `users`, `levels` all live there).
2. **Proposed adding `active_dashboard_role` column + validation trigger** — overkill. The JSON blob in `user_preferences.dashboard_layout` already stores per-user UI state. Adding a column when a JSON field will do violates "least invasive change."
3. **Missed that `TeamDashboardsCard` and `useTeamDashboardSummary` already existed** — would have re-built the exact same component under a different name, creating a fork hazard.
4. **Didn't catch the `pickPrimaryRoleKey` collapse case** — two roles that resolve to the same template don't deserve a switcher. v1 would have shown a no-op switcher to admin+super_admin users.

### Doctrine alignment (re-checked)

- ✅ Stylist Privacy Contract — switching to `stylist` activates the stylist allowlist; combining is rejected.
- ✅ Owner authority — owners remain sole authors of role layouts.
- ✅ Persona scaling — solo stylists never see manager surfaces accidentally.
- ✅ Settings Navigation Uniformity — uses the established settings detail pattern.
- ✅ Visibility Contract — switcher returns `null` when there's no real choice (no noise).
- ✅ State Updates — `user_preferences` JSON uses read-then-update (already standard).

### Out of scope (deferred)

- Sidebar shortcut to Role Dashboards — defer until owners report it's hard to find inside Settings.
- A separate "compare roles" view — defer; doctrine says "one primary lever," and the existing Preview flow already covers comparison via View As.
- Per-location dashboard variants — separate concern, not blocked by this work.

---

### Approval question

This drops the build from ~7 file changes + migration to **~5 file changes + zero schema**. Approve v2?
