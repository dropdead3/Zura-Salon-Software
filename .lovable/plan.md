

## Restrict Cha-Ching Notifications to Owners and Super Admins

### Changes

**File: `src/hooks/useChaChingDetector.tsx`**
- Import `useEmployeeProfile` 
- Read `is_primary_owner` and `is_super_admin` from the profile
- Add a guard: only fire cha-ching toast/sound when `is_primary_owner || is_super_admin` is true
- Add profile fields to the effect dependency array

**File: `src/components/dashboard/settings/SoundSettingsSection.tsx`**
- Import `useEmployeeProfile`
- Read `is_primary_owner` and `is_super_admin` from the profile
- Conditionally render the "Checkout notifications" toggle row only when `is_primary_owner || is_super_admin`
- No change to sound preview buttons or general sound toggle (those remain for all users)

Both changes use the existing `useEmployeeProfile` hook which already returns `is_super_admin` and `is_primary_owner` from `employee_profiles`. No database changes needed -- the setting toggle (`chaChingEnabled` in localStorage) already exists and continues to function as the on/off control for eligible users.

