

## Two Enhancements to the Dual-Role Login Flow

### 1. "Change default login destination" in Platform Settings

Add a new section to `PlatformAccountTab.tsx` that lets dual-role users view and reset their saved login destination preference.

**What it does:**
- Queries `user_preferences.dual_role_destination` for the current user
- Displays the current default (e.g., "Platform Admin" or "Organization Dashboard") with a "Reset" button
- Resetting sets `dual_role_destination` to `null`, so the interstitial reappears on next login
- Only visible to users who actually have both platform roles and org membership

**Files modified:**
- `src/components/platform/settings/PlatformAccountTab.tsx` — add a "Login Destination" card section at the bottom with current preference display and reset button

### 2. Multi-org support in the interstitial

Currently the interstitial assumes a single org membership. Users who admin/own multiple organizations should see all of them.

**What it does:**
- `checkDualRoleStatus()` in `UnifiedLogin.tsx` fetches ALL org memberships (from both `employee_profiles` and `organization_admins`) instead of just the first one
- `DualRoleInfo` changes from `orgSlug/orgName` to `orgs: Array<{ slug: string; name: string }>`
- The interstitial card shows "Platform Admin" as one option, then lists each organization as a separate button (e.g., "Drop Dead Salon Dashboard", "Second Location Dashboard")
- If only one org exists, the UI stays simple (two buttons). If multiple orgs exist, they are listed vertically
- "Remember my choice" persists the chosen destination including the specific org slug

**Files modified:**
- `src/pages/UnifiedLogin.tsx`:
  - Update `DualRoleInfo` interface to hold an array of orgs
  - Update `checkDualRoleStatus()` to query both `employee_profiles` and `organization_admins`, deduplicating by org ID, and fetching name/slug for each
  - Update the interstitial UI to render one button per org
  - Update `saveDualRolePreference` to store the org slug when destination is org-based
  - Update `getDualRolePreference` auto-redirect logic to use the stored slug
- `src/components/platform/settings/PlatformAccountTab.tsx`:
  - Add "Login Destination Preference" card section

### Technical Notes

- No database migration needed — `dual_role_destination` text column can store `'platform'` or `'org_dashboard:slug-name'` format
- The reset action uses the existing `saveDualRolePreference` function with `null`
- Multi-org query reuses the same pattern as `useUserOrganizations` hook but as a one-shot async call during login

