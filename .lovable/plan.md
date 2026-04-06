

# Security Hardening — Phase 3: Fix Remaining 12 Findings

## Summary

The scan found 6 critical errors, 4 warnings, and 2 info items. Several are leftover from the previous migration where policies were added but old permissive policies were not dropped. This pass will fix all actionable items.

---

## Critical Fixes

### 1. Chat attachments — drop public SELECT policy
The old `Anyone can view chat attachments` policy on `storage.objects` still grants unauthenticated access despite the bucket being private. Drop it. Authenticated access already works via signed URLs.

### 2. Platform feedback screenshots — drop public SELECT policy
Same issue: `Anyone can view feedback screenshots` still exists. Drop it.

### 3. Business settings — drop duplicate permissive policy
Two SELECT policies exist: the new restricted one (`Admins and platform users can view business settings`) AND the old `Authenticated users can view business settings` which uses `auth.uid() IS NOT NULL`. The old one overrides the new one. Drop the old policy.

### 4. Twilio credentials — create restricted organizations view
The `Users can view their own organization` policy returns all columns including `twilio_auth_token` and `twilio_account_sid`. 

**Fix**: Create a `SECURITY DEFINER` function `get_organization_safe(org_id)` that returns all columns EXCEPT Twilio credentials. Restrict the existing SELECT policy to admins/platform users only. Non-admin org members use the safe function. Alternatively, move Twilio columns to a separate `organization_secrets` table with admin-only RLS.

**Chosen approach**: Move Twilio credentials to a new `organization_secrets` table:
- Create `organization_secrets` table (organization_id FK, twilio_account_sid, twilio_auth_token)
- Migrate data from organizations table
- Drop columns from organizations
- RLS: only platform users and org admins can SELECT
- Update any edge functions that read Twilio creds

### 5. Employee login PINs — hash PINs
PINs are stored in plaintext and readable by coaches. 

**Difficulty**: High. This requires changing the PIN validation flow (`validate_dock_pin`, `validate_user_pin`), hashing existing PINs, and updating all PIN-set flows. This is a significant architectural change.

**Recommendation**: Flag as a follow-up architectural task. For now, we can remove `login_pin` from the SELECT columns returned by the coach policy, which at least prevents coaches from reading PINs directly. The validation RPCs (SECURITY DEFINER) already handle comparison server-side.

**Interim fix**: Create a view or modify the coach SELECT policy to exclude `login_pin` from results returned to non-admin roles. Since RLS policies can't filter columns (only rows), the real fix is either:
- Move `login_pin` to a separate table with admin-only access
- Or hash the PINs

We'll move `login_pin` to a new `employee_pins` table with SECURITY DEFINER-only access, and update the validation RPCs.

### 6. Realtime — no channel authorization
`realtime.messages` has no RLS, so any authenticated user can subscribe to any channel topic.

**Difficulty**: High. The `realtime` schema is Supabase-reserved — we cannot add RLS policies to `realtime.messages` directly. This requires Supabase-native Realtime authorization (channel-level policies via `supabase.channel()` config).

**Recommendation**: Mark as architectural limitation. Document that Realtime channel authorization must be enforced at the application layer by validating organization membership before subscribing.

---

## Warning Fixes

### 7. Kiosk assets — restrict upload/update/delete
Replace the 3 kiosk storage policies that check only `auth.uid() IS NOT NULL` with proper authorization. Since storage policies can't easily join to org tables via file path, restrict to users who have the `can_manage_kiosk_settings()` function returning true.

### 8. Leaked password protection
This is a dashboard-level toggle (Cloud → Users → Auth Settings → HIBP check). Cannot be fixed via migration. Will note for user to enable manually.

### 9-10. Extensions in public / permissive RLS
Info-level. Extensions can't be moved without potential breakage. The remaining `USING(true)` policies need identification and fixing.

---

## Implementation

### Migration SQL
```sql
-- 1. Drop leftover public storage policies
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view feedback screenshots" ON storage.objects;

-- 2. Drop old permissive business_settings policy
DROP POLICY IF EXISTS "Authenticated users can view business settings" ON public.business_settings;

-- 3. Fix kiosk asset policies
DROP POLICY IF EXISTS "Org admins can upload kiosk assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update kiosk assets" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete kiosk assets" ON storage.objects;
-- Recreate with proper auth check using can_manage_kiosk_settings()

-- 4. Move login_pin to separate table
CREATE TABLE public.employee_pins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  login_pin TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.employee_pins ENABLE ROW LEVEL SECURITY;
-- No SELECT policy (access only via SECURITY DEFINER RPCs)
-- Migrate data from employee_profiles
INSERT INTO employee_pins SELECT user_id, login_pin, organization_id FROM employee_profiles WHERE login_pin IS NOT NULL;
-- Update validate_dock_pin and validate_user_pin RPCs to read from employee_pins
-- Drop login_pin column from employee_profiles

-- 5. Move Twilio creds to organization_secrets
CREATE TABLE public.organization_secrets (...);
-- Migrate, update edge functions, drop columns from organizations
```

### Frontend Changes
- Update any PIN-setting hooks to write to `employee_pins` table
- Update Twilio-related edge functions to read from `organization_secrets`
- No changes needed for chat/feedback storage (signed URLs already in use)

### Items Deferred (Architectural)
- **Realtime authorization**: Cannot modify `realtime` schema. Requires application-layer enforcement.
- **PIN hashing**: Moving to separate table is step 1; hashing is step 2 (follow-up).
- **Leaked password protection**: User must enable via Cloud UI.

---

## Files Affected

| File | Change |
|------|--------|
| New migration SQL | Drop policies, create tables, move data, update RPCs |
| Edge functions using Twilio | Read from `organization_secrets` |
| PIN-related hooks | Write to `employee_pins` instead of `employee_profiles.login_pin` |
| Security findings | Update/delete resolved findings |

