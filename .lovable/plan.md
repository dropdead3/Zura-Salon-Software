

# Add Assistant Role to Alex Day and Test

## Problem

Alex Day (user_id: `52c43316-2ba5-4367-96d4-f097f8a492ea`) currently only has the `admin` role. While the assistant picker filter on line 819 of `AppointmentDetailSheet.tsx` does include `admin` as an eligible role, having the explicit `stylist_assistant` role is the correct architectural approach -- it ensures Alex is properly identified as an assistant throughout the system (scheduling, reporting, persona scaling).

## What Changes

### 1. Database: Add `stylist_assistant` role to Alex Day

Run a migration to insert a `stylist_assistant` role for Alex:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('52c43316-2ba5-4367-96d4-f097f8a492ea', 'stylist_assistant')
ON CONFLICT (user_id, role) DO NOTHING;
```

This gives Alex both `admin` and `stylist_assistant` roles, which is valid -- `admin` for his management access, `stylist_assistant` for his service-provider function.

### 2. Verify the assistant picker works

After the role is added, clicking Alex in the assistant picker on the appointment detail sheet should successfully insert into `appointment_assistants` and show the toast "Assistant assigned."

## Files Modified

| Area | Change |
|------|--------|
| Database migration | Add `stylist_assistant` role to Alex Day's user_roles |

No code changes needed -- the existing filter already supports `admin`, `stylist`, and `stylist_assistant` roles.

## Debugging Note

If the assignment still fails after the role change, the issue would be in the RLS `WITH CHECK` policy on `appointment_assistants` (which uses `is_org_member`). We confirmed Alex's `employee_profiles` record exists in the organization, so this should pass. We will test end-to-end after the migration.
