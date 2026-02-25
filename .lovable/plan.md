

## Organize View As Team List by Location and Role Hierarchy

The Team tab in the "View Dashboard As" dropdown currently renders a flat alphabetical list of staff. This change groups members by location first, then sorts by role hierarchy (using `sort_order` from the `roles` table) within each group.

### Current State

- `realUsers` is filtered from `teamMembers` (from `useTeamDirectory`), then sliced to 10
- Each member has `location_id` (single, nullable) and `location_ids` (array) plus `roles` array
- Rendered as a flat list with name + primary role label
- Roles table has `sort_order`: super_admin(1), admin(2), admin_assistant(3), manager(4), bookkeeper(5), operations_assistant(6), receptionist(7), stylist(8), booth_renter(9), stylist_assistant(10)
- Two locations exist: "North Mesa" and "Val Vista Lakes" -- most staff currently have `location_id: null`

### What Changes

**File: `src/components/dashboard/DashboardLayout.tsx`**

1. Import `useLocations` from `@/hooks/useLocations`
2. Fetch locations inside `ViewAsToggle` (or use the already-available data)
3. Replace the flat `realUsers.map(...)` rendering (lines 763-801) with a grouped structure:
   - Build a role hierarchy map from `ALL_ROLES` (already ordered by `sort_order` from the database)
   - Group `realUsers` by their `location_id` (members with null location_id go into an "Unassigned" group)
   - Within each location group, sort members by their highest-priority role (lowest `sort_order`), then alphabetically by name
   - Render each location as a section header label, followed by its members
4. Remove the `.slice(0, 10)` limit since grouped display benefits from showing all members (the container already scrolls)
5. Location section headers: small muted text label (e.g., "North Mesa", "Unassigned") with a subtle top border separator between groups

### Visual Result

```text
┌─────────────────────────────┐
│ Search team members...      │
├─────────────────────────────┤
│ NORTH MESA                  │
│  👤 Eric Day                │
│     Super Admin             │
├─────────────────────────────┤
│ UNASSIGNED                  │
│  👤 Alex Day                │
│     Director Of Operations  │
│  👤 Kristi Day              │
│     Super Admin             │
│  👤 Mallori Schwab          │
│     Front Desk              │
│  👤 Julia Gross             │
│     Front Desk              │
│  👤 Alexis Heasley          │
│     Stylist                 │
│  👤 Brooklyn Colvin         │
│     Stylist                 │
│  ...                        │
└─────────────────────────────┘
```

### Technical Details

- Role sort order is derived from the index position in `ALL_ROLES` (which comes from `useRoleUtils` and is already database-ordered by `sort_order`)
- For members with multiple roles, the highest-priority role (lowest index in `ALL_ROLES`) determines sort position
- Location groups are ordered: named locations first (alphabetically), then "Unassigned" last
- The search filter still applies across all groups
- Section header uses `font-display text-[10px] tracking-wider text-muted-foreground` (Termina, uppercase per UI Canon)
- No database changes required

