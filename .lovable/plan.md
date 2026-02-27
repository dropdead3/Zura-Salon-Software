

## Remove Alex Day's Extra Roles

Alex Day (alexmaxday@gmail.com) currently has two entries in `user_roles`:
- `admin` (displayed as "Director Of Operations") — ID: `4d1bc127-cde1-4ad4-9d45-165cf10c50fa`
- `stylist_assistant` (displayed as "Stylist Assistant") — ID: `83345e39-87d2-4bf8-8c04-4818adb2fe25`

His Super Admin status is preserved via `employee_profiles.is_super_admin = true`, so removing these roles will not affect his SA badge.

### Change

**Database operation** — delete both role assignments:

```sql
DELETE FROM user_roles 
WHERE user_id = '52c43316-2ba5-4367-96d4-f097f8a492ea' 
  AND role IN ('admin', 'stylist_assistant');
```

No code changes required. After deletion, Alex will show only the Super Admin badge in the Access Hub.

