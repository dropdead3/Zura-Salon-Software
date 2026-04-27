# Remove "Team Dashboards" Card from Command Center

The role-switcher in the Customize menu already lets owners preview each role's dashboard, so the dedicated **Team Dashboards** card is redundant. This change removes it from the rendered Command Center while leaving the underlying component file intact (in case it's wanted back later).

## What changes for the user
- The "Team Dashboards" card (with Manager / Stylist / Receptionist / Admin / Bookkeeper preview tiles) disappears from the Command Center home.
- No data is lost. Role-preview still works via the existing role-switcher.
- Existing owner layouts that already had this section will be auto-cleaned on next load.

## Technical changes

**1. `src/pages/dashboard/DashboardHome.tsx`**
- Drop the `TeamDashboardsCard` import.
- Remove the `team_dashboards: <TeamDashboardsCard />` entry from the `sectionComponents` map (replace with a comment explaining why).

**2. `src/hooks/useDashboardLayout.ts`**
- Remove `'team_dashboards'` from `DEFAULT_LAYOUT.sections` and `DEFAULT_LAYOUT.sectionOrder`.
- Replace the existing additive migration shim (Phase 2.5) that *inserts* `team_dashboards` after `hub_quicklinks` with a **subtractive** shim that *strips* `team_dashboards` from any persisted layout that still contains it. This auto-heals existing user layouts and the `account_owner` template seed without breaking other sections.

**3. Database — `dashboard_layout_templates` table**
- Run a one-time data update that strips `"team_dashboards"` from both `layout.sections` and `layout.sectionOrder` for every template row that contains it (currently `account_owner` and any other seeded role templates).

## What stays
- `src/components/dashboard/TeamDashboardsCard.tsx` — file kept (no import references after this change). Cheap insurance if we ever want it back.
- `STYLIST_FORBIDDEN_SECTIONS` entry for `team_dashboards` in `src/lib/dashboard/stylistPrivacy.ts` — kept (defensive: any stale persisted layout that somehow re-introduces the section will still be blocked from stylist views).
- The privacy-contract test assertion stays green.

## Verification
- Vitest run on `stylist-privacy-contract.test.ts` (15 tests should still pass).
- Manual: reload `/org/:slug/dashboard` as Account Owner → Team Dashboards card no longer renders; all other sections (Daily Briefing, Decisions Awaiting, pinned analytics, Team Pulse, Upcoming, Tasks, Announcements, Widgets) render in their existing order.
