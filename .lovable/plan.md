

## Add Management Hub to Sidebar Navigation

**Problem**: The Management Hub (`/dashboard/admin/management`) exists as a route and appears in the Command Center quick-access grid, but it is not listed in any of the sidebar navigation item arrays in `src/config/dashboardNav.ts`. This means it never renders in the left sidebar.

### Implementation

**File: `src/config/dashboardNav.ts`**

Add a Management Hub entry to `managerNavItems` under the `operations` manager group (alongside other hub-style links like Analytics Hub):

```ts
{ href: '/dashboard/admin/management', label: 'Management Hub', labelKey: 'management_hub', icon: LayoutGrid, permission: 'view_team_overview', managerGroup: 'operations' },
```

This will place it inside the Management section's "Operations" sub-group, consistent with how Analytics Hub appears under `analytics`.

**Import**: `LayoutGrid` is already imported in `dashboardNav.ts`.

### What this changes
- Management Hub will appear in the sidebar under Management > Operations for users with `view_team_overview` permission
- No route, component, or permission changes needed -- the route already exists in `App.tsx`

