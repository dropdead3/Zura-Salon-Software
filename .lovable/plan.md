

## Add Role Icons to Badges in Roles & Controls Hub

Two locations need role icons added — both currently only show the Crown for super_admin while ignoring the `role.icon` field for all other roles.

### Changes in `src/components/access-hub/UserRolesTab.tsx`

#### 1. Stats Bar (lines 500-529)
- Import `getRoleIconComponent` from `RoleIconPicker`
- For each role card, resolve `const Icon = getRoleIconComponent(role.icon)` 
- Render `<Icon className="w-3 h-3" />` next to the role label (replacing the super_admin-only Crown conditional)

#### 2. Role Overview Legend (lines 561-586)
- Same pattern: resolve icon from `role.icon` for every role
- Render the icon inside each `<Badge>` before the display name (replacing the super_admin-only Crown conditional)

### No new files needed — single file edit to `UserRolesTab.tsx`.

