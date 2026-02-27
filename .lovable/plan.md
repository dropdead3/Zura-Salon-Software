

## Fix Badge UI Consistency — Add Role Icons Everywhere

The role badges are inconsistent: the top bar and Role Overview legend show icons, but the **table view badges** and **filter bar** do not. The `RoleOption` interface in both `UserRolesTableView.tsx` and `UserRolesFilterBar.tsx` is also missing the `icon` field.

### Changes

#### 1. `src/components/access-hub/UserRolesTableView.tsx`
- Add `icon` to local `RoleOption` interface
- Import `getRoleIconComponent` from `RoleIconPicker`
- In the Roles column badges (line 179-185), resolve and render the role icon before the display name
- In the expanded role toggle labels (line 258), also render the role icon

#### 2. `src/components/access-hub/UserRolesFilterBar.tsx`
- Add `icon` to local `RoleOption` interface
- Import `getRoleIconComponent`
- Render role icons in the role filter dropdown chips for visual consistency

### Scope
Three files touched, no new files. Pure UI consistency fix — no data or hook changes needed since the `icon` field is already present on the role objects passed from the parent.

