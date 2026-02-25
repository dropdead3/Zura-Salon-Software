

## Elevate Kristi Day to Super Admin and Organization Owner

Kristi's current state confirms she still needs the elevation -- she has only the `stylist` role, no super admin flag, and no entry in `organization_admins`.

### What Will Be Executed

Three data updates (no schema changes):

1. **Set `is_super_admin = true`** on her `employee_profiles` record
2. **Add `super_admin` and `admin` roles** to `user_roles` (keeping `stylist` since she also does hair -- if she doesn't, we can remove it after)
3. **Insert into `organization_admins`** with `role = 'owner'` for Drop Dead Hair Studio

### What This Grants

- Full dashboard access (all admin surfaces, team management, financial visibility)
- Equivalent permissions to Eric's account, minus Primary Owner PIN protection
- Passes `is_org_admin()` and `is_org_member()` RLS checks
- The `ensure_super_admin_has_role` trigger will auto-add `admin` role if not already present

### After Elevation

Kristi's auth account was created with a random password during the bulk staff import. She will need a **password reset** to set her own password before she can log in at `kristi@dropdeadsalon.com`.

### Technical Details

```sql
-- 1. Upgrade employee profile
UPDATE employee_profiles SET is_super_admin = true
WHERE user_id = '4f9562e9-925c-4037-bfaa-728f18afdefa';

-- 2. Add super_admin and admin roles (keep stylist)
INSERT INTO user_roles (user_id, role) VALUES
  ('4f9562e9-925c-4037-bfaa-728f18afdefa', 'super_admin'),
  ('4f9562e9-925c-4037-bfaa-728f18afdefa', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Add to organization_admins as owner
INSERT INTO organization_admins (user_id, organization_id, role)
SELECT '4f9562e9-925c-4037-bfaa-728f18afdefa', organization_id, 'owner'
FROM employee_profiles
WHERE user_id = '4f9562e9-925c-4037-bfaa-728f18afdefa';
```

All three are idempotent. No risk of duplication.

