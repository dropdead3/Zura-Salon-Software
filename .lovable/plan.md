

# Add Transactions to Sidebar Manage Section

## What Changes

One file edit in `src/config/dashboardNav.ts`:

**Add a Transactions entry** to `manageNavItems` and reorder so the final order is:
1. Analytics Hub
2. Report Generator
3. Transactions
4. Operations Hub

The Transactions link will point to `/dashboard/appointments-hub?tab=transactions` (matching the existing route) with the `Receipt` icon (already imported) and gated behind `view_transactions` permission.

```ts
// manageNavItems becomes:
export const manageNavItems: DashboardNavItem[] = [
  { href: '/dashboard/admin/analytics', label: 'Analytics Hub', ... },
  { href: '/dashboard/admin/reports', label: 'Report Generator', ... },
  { href: '/dashboard/appointments-hub?tab=transactions', label: 'Transactions', icon: Receipt, permission: 'view_transactions' },
  { href: '/dashboard/admin/team-hub', label: 'Operations Hub', ... },
];
```

Since the sidebar, search, and quick links all consume from the nav registry, no other files need updating.

## Technical Detail

- `Receipt` icon is already imported in `dashboardNav.ts` (line 44)
- Permission `view_transactions` matches the existing `ProtectedRoute` guard on the appointments-hub page
- The sidebar active-state matcher uses `startsWith`, so the query param won't break highlighting

