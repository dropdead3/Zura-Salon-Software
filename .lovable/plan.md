

# Remove System Section Label & Roles & Controls Hub from Sidebar

## Problem

The "System" section in the sidebar shows two items: "Roles & Controls Hub" and "Settings". Since Roles & Controls Hub already lives inside Settings, it's redundant in the sidebar. The "SYSTEM" label also adds unnecessary visual weight — Settings should just sit below a subtle divider with no header.

## Changes

### 1. `src/config/dashboardNav.ts` (~line 114-116)

Remove the "Roles & Controls Hub" entry from `systemNavItems`, leaving only "Settings":

```ts
export const systemNavItems: DashboardNavItem[] = [
  { href: '/dashboard/admin/settings', label: 'Settings', ... },
];
```

### 2. `src/components/dashboard/SidebarNavContent.tsx` (~line 575)

Suppress the section header for the `system` section by adding it to the condition that already hides the `main` section header:

```tsx
{!isCollapsed && sectionId !== 'main' && sectionId !== 'system' && (
```

This keeps the divider line (rendered at line 568-571) but removes the "SYSTEM" label text, so Settings appears cleanly separated.

| File | Change |
|------|--------|
| `src/config/dashboardNav.ts` | Remove Roles & Controls Hub from `systemNavItems` |
| `src/components/dashboard/SidebarNavContent.tsx` | Hide section label for `system` section |

