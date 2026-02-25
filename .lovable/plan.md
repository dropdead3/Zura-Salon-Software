

## Add "I Also Perform Services" Toggle for Admin-Level Staff

Good prompt -- this addresses a real role-boundary issue. Admin-level users (super_admin, admin, manager, admin_assistant, bookkeeper, operations_assistant, receptionist) should not see Professional Details unless they explicitly opt in as a service provider. This keeps the profile clean for non-service roles while supporting the common reality of owner-operators who also work behind the chair.

### Current State

- Professional Details section shows if `roles.includes('stylist') || roles.includes('stylist_assistant')`
- Eric Day has both `super_admin` and `stylist` roles, so he sees it -- but the user wants this to be an explicit opt-in, not automatic from having a stylist role alongside admin roles
- No `is_also_stylist` or equivalent flag exists in the database
- The `user_roles` table manages role assignments separately from profiles

### Design Decision

Rather than adding a boolean flag to `employee_profiles`, the correct approach is to use the existing role system: when an admin user toggles "I also perform services," we **add the `stylist` role** to their `user_roles` entry. When they toggle it off, we **remove it**. This keeps authorization consistent -- the stylist role grants all stylist permissions and visibility through the existing RBAC system, exactly as the user described.

### What Changes

**1. Database: No schema changes needed**
- The `user_roles` table already supports multiple roles per user
- Adding/removing `stylist` role is a simple insert/delete

**2. File: `src/pages/dashboard/MyProfile.tsx`**

- Define admin-level roles: `['super_admin', 'admin', 'manager', 'admin_assistant', 'bookkeeper', 'operations_assistant', 'receptionist']`
- Compute `isAdminLevel` = user has any admin-level role
- Compute `hasStylistRole` = `roles.includes('stylist') || roles.includes('stylist_assistant')`
- Compute `isPureStylist` = has stylist role but NO admin-level roles (shows Professional Details unconditionally)
- Compute `isAdminWithStylistRole` = has both admin-level and stylist roles

- **New toggle section** (placed before Professional Details, visible only to admin-level users):
  - Card with a Switch: "I also perform services"
  - Description: "Enable this if you also work behind the chair. This will add stylist permissions and allow you to set up your professional profile."
  - Toggle ON: calls mutation to insert `stylist` role into `user_roles` for this user
  - Toggle OFF: calls mutation to remove `stylist` role from `user_roles` (with confirmation if they have existing specialties/level data)

- **Conditional display logic** changes:
  - `isPureStylist`: show Professional Details + Website Card Preview (no toggle needed)
  - `isAdminLevel && hasStylistRole`: show the toggle (ON state) + Professional Details + Website Card Preview
  - `isAdminLevel && !hasStylistRole`: show the toggle (OFF state) only, no Professional Details

- Update validation: skip stylist-specific validation when `!hasStylistRole`

**3. New hook or inline mutation for role toggle**

- Insert: `supabase.from('user_roles').insert({ user_id, role: 'stylist' })`
- Delete: `supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'stylist')`
- Invalidate `['user-roles']` query key and refresh auth context roles

### Visual Result

For admin-level staff without stylist role:
```text
┌─────────────────────────────────────────┐
│ I ALSO PERFORM SERVICES                 │
│                                         │
│ Enable this if you also work behind     │
│ the chair. This adds stylist            │
│ permissions to your profile.    [OFF]   │
└─────────────────────────────────────────┘
```

After toggling ON, Professional Details and Website Card Preview sections appear below.

### Technical Details

- The toggle mutates `user_roles` directly, which is the source of truth for RBAC
- `useAuth` context refreshes roles after mutation, so all permission gates, `VisibilityGate`, and `ProtectedRoute` checks update immediately
- No new database columns or tables needed
- Existing `isStylistRole` checks throughout the page continue to work because they read from `roles` which now accurately reflects the toggle state
- Profile completion calculation already conditionally includes stylist fields based on role check (line 185)

