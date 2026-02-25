

## Allow Admin-Level Staff to Upload Their Own Profile Photo

Good catch -- as the account owner / highest admin, you should absolutely be able to manage your own headshot. The current logic locks the photo section for anyone with the `stylist` role, even if they're also an admin or super_admin. The "Admin Managed" lockdown should only apply to pure stylists who don't have administrative privileges.

### Root Cause

Line 545 in `MyProfile.tsx` uses `isStylistRole` (true if user has `stylist` or `stylist_assistant` role) to decide whether to show the locked "Admin Managed" state or the self-upload UI. Since you have both `super_admin` and `stylist` roles, you get the locked state.

### Fix

**File: `src/pages/dashboard/MyProfile.tsx`**

Change the photo section's conditional from `isStylistRole` to a new computed value that means "has stylist role but is NOT admin-level":

```
const isPhotoLocked = isStylistRole && !isAdminLevel;
```

Then replace all photo-section references to `isStylistRole` with `isPhotoLocked`:

1. **Line 535**: Lock icon next to "Profile Photo" title -- show only when `isPhotoLocked`
2. **Lines 538-540**: Card description -- use `isPhotoLocked` to choose between "managed by admin" vs "visible to the team"
3. **Line 545**: The main conditional that switches between locked state and upload state -- use `isPhotoLocked`

This means:
- **Pure stylists** (no admin roles): see the locked "Admin Managed" state with "Schedule Headshot" button -- unchanged
- **Admin-level staff with stylist role** (like you): see the normal upload UI with "Change Photo" button
- **Admin-level staff without stylist role**: already see the upload UI -- unchanged

### What Does Not Change

- No database changes
- No new hooks or mutations
- The `isStylistRole` variable remains for all other uses (Professional Details visibility, validation, etc.)
- Only the photo section's lock/unlock logic is affected

