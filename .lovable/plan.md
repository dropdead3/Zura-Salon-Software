

# Fix: Zura Connect Sidebar Visibility

## Problem

The "Zura Connect" link in the sidebar "Zura Apps" section requires `permission: 'manage_settings'`, which is an admin-only permission. This means non-admin staff with Connect access see the Chat tab in the FAB but not the nav link to reach the full Team Chat page. The entitlement check works correctly — your org has `connect_enabled` set to true.

## Root Cause

In `dashboardNav.ts` line 108, `Zura Connect` has `permission: 'manage_settings'`. This was likely copied from Color Bar (which is an admin settings page). But `/team-chat` is a user-facing page, not an admin settings page — it should be accessible to all authenticated org members.

## Change

| File | Change |
|------|--------|
| `src/config/dashboardNav.ts` | Remove `permission: 'manage_settings'` from the Zura Connect nav item (line 108). The entitlement gate in `SidebarNavContent.tsx` (line 578) already handles access control — only orgs with `connect_enabled` see the link. No additional permission gate is needed. |

### Detail

```typescript
// Before
{ href: '/dashboard/team-chat', label: 'Zura Connect', labelKey: 'connect', icon: MessageSquare, permission: 'manage_settings' },

// After
{ href: '/dashboard/team-chat', label: 'Zura Connect', labelKey: 'connect', icon: MessageSquare },
```

This is a one-line fix. The entitlement filtering in `SidebarNavContent.tsx` (lines 577-578) already ensures the link only appears for orgs with Connect enabled. Color Bar keeps `manage_settings` since that links to an admin settings page.

