

## Redesign "View As" Popover — Tabbed UI with Roles, Team, and Test Accounts

The current "View As" popover only shows a role list. You want three tabs: **Roles** (existing role impersonation), **Team** (impersonate a specific team member via `setViewAsUser`), and **Test Accounts** (placeholder for future test account infrastructure).

### Approach

Extract the `ViewAsToggle` inline component from `DashboardLayout.tsx` into a dedicated `ViewAsPopover.tsx` component with a cleaner, tabbed design.

### Structure

**Tab 1 — Roles** (existing behavior, refined)
- Grouped by category (Leadership, Operations, Stylists, Other)
- Each role row: icon + display name → calls `setViewAsRole(role.name)`

**Tab 2 — Team**
- Search input to filter team members
- Fetch active `employee_profiles` with their roles via `useAllUsersWithRoles`
- Each row: avatar + name + role badges → calls `setViewAsUser({ id, full_name, roles })`
- Exclude the current logged-in user from the list

**Tab 3 — Test Accounts**
- Empty state with explanation: "Test accounts allow safe simulation without affecting real data"
- "Coming Soon" indicator — no database table exists yet for test accounts
- This plants the UI slot for future implementation

### UI Design

- Tabs rendered with a compact `TabsList` (Roles | Team | Test Accounts) inside the popover header
- Glass card aesthetic matching the overflow menu (`bg-card/80 backdrop-blur-xl`)
- Team tab: scrollable list with `max-h-[320px]` and search at top
- Active/exit state: when in View As mode, show the impersonated context (role name or user name) with an "Exit" button instead of opening the popover

### Files

| File | Action |
|------|--------|
| `src/components/dashboard/ViewAsPopover.tsx` | **Create** — new tabbed popover component |
| `src/components/dashboard/DashboardLayout.tsx` | **Edit** — replace inline `ViewAsToggle` with the new component |

### Technical Notes

- `useAllUsersWithRoles` hook already exists and returns `{ user_id, full_name, display_name, photo_url, roles }` — perfect for the Team tab
- `setViewAsUser` from `ViewAsContext` accepts `{ id, full_name, roles }` — already wired for user impersonation
- Avatar fallback: initials from `full_name` when no `photo_url`
- Font rules: tab labels use `font-sans` (Aeonik Pro), category headers use `font-display` (Termina) `text-[10px] tracking-[0.12em] uppercase`

