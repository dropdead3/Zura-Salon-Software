

## Add Role Icons to Role Badges in Team Directory

The role badges on team member cards currently show only the role label text (e.g., "Stylist", "Receptionist"). The Super Admin and Account Owner badges already include the Crown icon. This change adds the corresponding role icon to all other role badges, using the existing `useRoleUtils` hook which dynamically resolves icons from the database.

### What Changes

**File: `src/pages/dashboard/TeamDirectory.tsx`**

1. Import `useRoleUtils` and `getIconComponent` from `@/hooks/useRoleUtils`
2. Inside `TeamMemberCard`, call `useRoleUtils()` to get `getRoleIcon`, `getRoleLabel`, and `getRoleBadgeWithBorderClasses`
3. Update the primary role badge (lines 894-901) to include the role icon component inline before the label, matching the same `w-3 h-3` sizing used by Crown icons on the Super Admin badge
4. Replace the hardcoded `roleLabels` and `roleColors` maps with the dynamic `useRoleUtils` functions for the primary role badge, so badge colors and labels stay in sync with the database role configuration

### Visual Result

Each role badge will show: `[icon] Label` -- for example, a Scissors icon before "Stylist" and a Phone icon before "Receptionist", consistent with the icon+label pattern already established by the Account Owner and Super Admin badges.

### Technical Details

- The `useRoleUtils` hook already provides `getRoleIcon(roleName)` which returns a Lucide component, and `getRoleBadgeWithBorderClasses(roleName)` for consistent badge styling
- The hardcoded `roleLabels`, `roleColors` maps at the top of the file are still needed for sorting/filtering logic, but the badge rendering will use the dynamic hook values
- Icon size: `w-3 h-3` to match existing Crown icons on Super Admin/Owner badges
- No database changes required -- role icons are already stored in the `roles` table

