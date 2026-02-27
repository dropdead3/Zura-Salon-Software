

## Remove Kristi's Extra Roles

Kristi Day (kristi@dropdeadsalon.com) currently has three roles in `user_roles`:
- `super_admin` — keep
- `admin` (Director of Operations) — remove
- `stylist` — remove

### Change

**Database operation** — delete the two extra role assignments:

```sql
DELETE FROM user_roles 
WHERE user_id = '4f9562e9-925c-4037-bfaa-728f18afdefa' 
  AND role IN ('admin', 'stylist');
```

No code changes required. After deletion, Kristi will show only the Super Admin badge.

