

## Enhance Roles & Controls Hub for Enterprise Scale

The current User Roles tab is a flat, unsorted list of user cards — unusable at 20+ staff, let alone 50-100+. It lacks location grouping, role filtering, bulk actions, and density controls. Here are the gaps and proposed improvements:

### Gaps Identified

1. **No location grouping** — Users are listed flat; multi-location orgs can't see who's where
2. **No role filter** — Can only search by name/email, not filter by role type
3. **No bulk role assignment** — Must toggle roles one user at a time
4. **No compact/dense view** — Each user card is tall (avatar + badges + toggles + history), consuming vertical space
5. **Role statistics bar doesn't filter by location** — Always shows org-wide totals
6. **No "unassigned" filter** — Can't find users with no roles
7. **Role Overview legend takes significant space** — Could be collapsible for returning users
8. **No pagination or virtualization** — All users render at once

### Proposed Enhancements

#### 1. Location Filter Bar + Role Filter (New Filter Row)
- Add a **location multi-select dropdown** above the user list (reusing existing `LocationFilter` pattern from `locationFilter.ts`)
- Add a **role filter dropdown** (multi-select) to show only users with specific roles
- Add an **"Unassigned" toggle** to surface users with zero roles
- Stats cards update dynamically based on active filters

#### 2. Location-Grouped User List
- When multiple locations exist, group users under collapsible location headers (same pattern as enterprise analytics — `Collapsible` with location name)
- Users with multiple `location_ids` appear under each relevant location
- Users with no location show under "Unassigned Location" group
- Single-location orgs keep the current flat list (no unnecessary grouping)

#### 3. Compact Table View Toggle
- Add a **List/Card toggle** in the toolbar
- **Card view** (current): Full user cards with avatars, badges, toggles
- **Table view** (new): Dense table with columns: Name, Email, Location, Roles (badge chips), Actions (expand to toggle)
- Default to table view when user count exceeds 15

#### 4. Collapsible Role Overview
- Wrap the Role Overview legend in a `Collapsible` — starts open on first visit, remembers collapsed state
- Saves vertical space for power users who already know the roles

#### 5. Bulk Role Assignment
- Add checkboxes in table view for multi-select
- "Assign Role" and "Remove Role" bulk action buttons appear when users are selected
- Uses existing `useToggleUserRole` mutation in a loop with Promise.all

### Files to Modify

- **`src/components/access-hub/UserRolesTab.tsx`** — Major refactor: add filter bar (location + role dropdowns), location grouping logic, compact table view, collapsible Role Overview, bulk selection
- **`src/hooks/useUserRoles.ts`** — Extend `useAllUsersWithRoles` to also fetch `location_id` and `location_ids` from `employee_profiles`
- **`src/components/access-hub/UserRolesTableView.tsx`** (new) — Dense table view component
- **`src/components/access-hub/UserRolesFilterBar.tsx`** (new) — Filter bar with location + role dropdowns

### Technical Notes

- Location data comes from `employee_profiles.location_ids` (array) with fallback to `location_id` (single)
- Locations list fetched from existing `locations` table
- All filtering is client-side (data is already loaded) — no new queries needed
- View preference (card vs table) stored in localStorage
- Role filter uses the existing `roles` query from `useRoles()`

