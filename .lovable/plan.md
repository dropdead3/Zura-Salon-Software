

# Role-Aware Sidebar for Super Admins

## Problem

The sidebar configurator overrides bypass `roles`-based filtering (line 491-493 in `SidebarNavContent.tsx`). This causes service-provider-only items like "New-Client Engine Program", "Ring the Bell", "My Graduation", "Team Leaderboard", and "Training" to appear for super admins. Super admins should see only management and operational tools — not individual contributor features.

## Analysis

**Current MY TOOLS items visible to super admin** (from screenshot):
- Team Stats ✅ keep
- Team Leaderboard ❌ remove (service provider competition tool)
- Training ❌ remove (unless still in onboarding — but super admins don't onboard this way)
- New-Client Engine Program ❌ remove (stylist growth tool)
- Ring the Bell ❌ remove (stylist achievement tool)
- My Graduation ❌ remove (stylist level progression)
- My Pay ✅ keep (owners need pay/compensation visibility)

**Root cause**: When the sidebar configurator has role overrides (`hasConfiguratorOverrides === true`), the code at line 491-493 filters from `orderedItems` instead of `permissionFilteredItems`, completely skipping the `roles` check on each nav item.

## Solution

The fix should ensure `roles`-based filtering is **always** enforced as a security/relevance layer, regardless of configurator overrides. The configurator should only control visibility *within* the set of role-appropriate items — it should never surface items that a role shouldn't see.

### Change 1: `src/components/dashboard/SidebarNavContent.tsx` (~line 488-497)

Modify the filtering logic so that even when `hasConfiguratorOverrides` is true, the `roles` array on each nav item is still respected. The configurator can hide additional items but cannot override role restrictions.

```tsx
// Always enforce role-based filtering first (security layer)
const roleFilteredItems = orderedItems.filter(item => {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.some(r => roles.includes(r));
});

let visibleItems: typeof roleFilteredItems;
if (hasConfiguratorOverrides) {
  visibleItems = roleFilteredItems.filter(item => !sectionHiddenLinks.includes(item.href));
} else {
  const permFiltered = filterNavItems(orderedItems).filter(item => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.some(r => roles.includes(r));
  });
  visibleItems = permFiltered.filter(item => !sectionHiddenLinks.includes(item.href));
}
```

### Change 2: `src/config/dashboardNav.ts` — Add `super_admin` to appropriate items

Several items that super admins **should** see don't include `super_admin` in their `roles` array. Update:

| Item | Current `roles` | Add `super_admin` |
|------|----------------|-------------------|
| Team Stats (`/dashboard/stats`) | no roles restriction | no change needed |
| My Pay (`/dashboard/my-pay`) | no roles restriction | no change needed |
| Waitlist | `super_admin` already included | ✅ |
| Training | `['admin', 'manager', 'stylist', 'stylist_assistant']` | **No** — super admins don't need personal training |

Items that remain excluded from super_admin (no `roles` change needed — they already don't list `super_admin`):
- New-Client Engine Program
- Ring the Bell
- My Graduation / My Level Progress
- Team Leaderboard
- Shift Swaps
- Rewards
- Today's Prep
- My Mixing

## Result

Super admin sidebar **MY TOOLS** section will show only:
- **Team Stats** — team-wide performance overview
- **Waitlist** — operational queue management
- **My Pay** — compensation visibility

All service-provider tools (leaderboard, training, graduation, ring the bell, new-client engine, shift swaps, rewards) will be hidden for super admins while remaining visible for their intended roles.

| File | Change |
|------|--------|
| `src/components/dashboard/SidebarNavContent.tsx` | Enforce `roles` filtering even when configurator overrides are active |
| `src/config/dashboardNav.ts` | No changes needed — existing `roles` arrays already correctly exclude `super_admin` from service-provider items |

