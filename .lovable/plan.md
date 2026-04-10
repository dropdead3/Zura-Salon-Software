

# Revised Plan: Consolidate Staff Strikes into Incident Reports

## Summary
Merge Staff Strikes into Incident Reports as a tabbed page. Addresses all gaps found in the original plan.

## Changes

### 1. New component: `src/components/dashboard/StaffStrikesTabContent.tsx`
- Extract the full strikes UI (filters, stats, strike cards, resolve/edit/delete dialogs) from `StaffStrikes.tsx` into a standalone component
- Accept a `defaultUserId` prop (from URL param) to pre-filter by employee
- Prevents the consolidated page from becoming a 700-line monolith

### 2. `src/pages/dashboard/admin/IncidentReports.tsx`
- Rename to **"Incidents & Accountability"**
- Add `Tabs` with two tabs: **Incidents** and **Staff Strikes**
- Read `?tab=strikes&userId=xxx` from URL via `useSearchParams`
- Show active strike count as a badge on the Strikes tab label
- Each tab has its own stat cards and content
- Update description: "Document incidents and track accountability measures"

### 3. `src/pages/dashboard/admin/TeamHub.tsx`
- Remove the **Staff Strikes** card
- Update Incident Reports card: title → "Incidents & Accountability", description → "Incident reports, strikes, and safety documentation"

### 4. `src/pages/dashboard/admin/ManagementHub.tsx`
- Remove the duplicate Staff Strikes card (line 247)

### 5. `src/App.tsx`
- Redirect `/admin/strikes` → `/admin/incidents?tab=strikes` using a `<Navigate>` with search param forwarding (preserves `?userId=xxx`)
- **Permission**: the redirect route keeps `manage_user_roles` gate; the incidents page itself uses `view_team_overview` — strikes tab content checks permission internally and shows read-only if user lacks `manage_user_roles`

### 6. `src/pages/dashboard/TeamDirectory.tsx`
- Fix line 795: change hardcoded path to use `dashPath('/admin/incidents')` with `?tab=strikes&userId=`

### 7. `src/components/dashboard/settings/SidebarLayoutEditor.tsx`
- Remove the `/dashboard/admin/strikes` entry (line 168)
- Update `/dashboard/admin/incidents` label to "Incidents & Accountability"

### 8. `src/config/pageExplainers.ts`
- Merge `staff-strikes` content into `incident-reports` entry
- Rename title to "Incidents & Accountability"

### 9. `src/hooks/useOpsHubFavorites.ts`
- Add a migration step: on load, if any favorite has `href` containing `/admin/strikes`, remap it to `/admin/incidents?tab=strikes` and persist the update

### Not touched
- `StaffStrikes.tsx` — kept as dead code (route redirects away). Can be deleted in follow-up.
- `reportCatalog.ts` / `ReportsTabContent.tsx` — reports remain independent
- All strike hooks and sub-components — still used by the new tab content

## Technical details
- `StaffStrikesTabContent` is a pure presentation extraction — same hooks, same state, just no `DashboardLayout` wrapper
- Two search params coexist: `tab` and `userId` — both read on mount
- Favorites migration runs once per user on first load after deploy

