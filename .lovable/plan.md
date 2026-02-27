

## Fix Stylist Badge Color Inconsistency

The root cause: two independent color systems define Stylist's appearance.

1. **`src/lib/roleBadgeConfig.ts`** — hardcoded `bg-blue-100 text-blue-800` for Stylist (used in nav bar badges)
2. **`getRoleColorClasses(role.color)`** from `RoleColorPicker.tsx` — reads the DB `color` field (used in Access Hub)

If someone set the Stylist role color to "pink" in the DB, the Access Hub shows pink while the nav bar shows blue.

### Fix Approach

Unify both systems so `roleBadgeConfig.ts` is no longer the source of truth for colors. Instead, make the nav bar badges also resolve colors from the DB-driven role configuration.

### Changes

#### 1. `src/hooks/useRoleUtils.ts` (or wherever role data feeds into `DashboardLayout`)
- Ensure the roles query data (with `color` and `icon` fields) is available where `buildRoleBadges` is called

#### 2. `src/lib/roleBadgeConfig.ts`
- Add an optional `colorOverride` parameter to `getRoleBadgeConfig` and `buildRoleBadges` that accepts the DB color field
- When a DB color is provided, use `getRoleColorClasses(dbColor)` to generate the badge colors instead of the hardcoded `colorClasses`

#### 3. `src/components/dashboard/DashboardLayout.tsx`
- Pass the roles data (with DB colors) into `buildRoleBadges` so nav bar badges use the same colors as the Access Hub

### Result
Stylist (and all roles) will show the same color everywhere — whatever color is configured in the DB role settings.

