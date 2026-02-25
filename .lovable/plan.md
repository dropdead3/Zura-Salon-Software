

## Elevate Kristi Day to Super Admin / Organization Owner

### Current State
- **Kristi Day** (`4f9562e9-925c-4037-bfaa-728f18afdefa`, `kristi@dropdeadsalon.com`)
  - Role: `stylist` only
  - `is_super_admin`: false
  - `is_primary_owner`: false
  - Not in `organization_admins` table
- **Eric Day** is currently the sole Primary Owner and Super Admin

### What Needs to Change

Since Kristi is the business owner alongside you, she needs full administrative access. This involves three database updates:

**1. Upgrade employee profile**
- Set `is_super_admin = true` on her `employee_profiles` record
- She won't be `is_primary_owner` (Eric holds that), but Super Admin grants full access to all settings, permissions, and management surfaces

**2. Fix roles in `user_roles` table**
- Add `super_admin` and `admin` roles
- Remove `stylist` role (she's the owner, not a service provider — unless she also does hair, in which case we keep it)

**3. Add to `organization_admins`**
- Insert her as `owner` role in the `organization_admins` table for Drop Dead Hair Studio
- This grants org-level admin access and passes the `is_org_admin()` RLS check

### What This Grants Kristi
- Full dashboard access (all admin surfaces)
- Team management, permission editing, approval authority
- Financial visibility (revenue, payroll, commission)
- Settings management (locations, integrations, kiosk)
- Equivalent access to Eric's, minus the Primary Owner PIN protection

### Note on Login
Kristi's auth account was created with a random password during the staff bulk-create. She will need a **password reset email** sent to `kristi@dropdeadsalon.com` before she can log in. I can trigger that after making the role changes.

### Technical Details
Three SQL statements will be executed:
1. `UPDATE employee_profiles SET is_super_admin = true WHERE user_id = '4f9562e9-...'`
2. `INSERT INTO user_roles` for `super_admin` and `admin` roles, `DELETE` the `stylist` role
3. `INSERT INTO organization_admins` with `role = 'owner'`

No schema changes required. No migration needed. These are data updates only.

