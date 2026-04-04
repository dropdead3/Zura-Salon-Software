

## Dual-Role Interstitial Enhancements

Three improvements to the post-login interstitial for users with both platform and org roles.

### Changes

**1. Add `dual_role_destination` column to `user_preferences`**

New migration adds a nullable text column to store the user's preferred destination (`platform` or `org_dashboard`). When set, the interstitial is skipped and the user is routed directly.

**2. Enhance `checkDualRoleStatus()` to fetch org name**

Currently fetches only `slug`. Will also select `name` from `organizations` and add `orgName` to the `DualRoleInfo` interface. The Organization Dashboard button will display the actual org name (e.g., "Drop Dead Salon Dashboard") instead of generic "Organization Dashboard".

**3. Add "Remember my choice" checkbox + preference persistence**

- Add a `rememberChoice` checkbox state to the interstitial card
- When a user clicks a destination with the checkbox checked, upsert `dual_role_destination` into `user_preferences`
- On subsequent logins, `checkDualRoleStatus` result is combined with a preference lookup — if a saved preference exists, auto-redirect without showing the interstitial
- The interstitial card gets a small "Remember my choice" checkbox below the two destination buttons

**4. Skip interstitial when preference exists**

After login, before showing the interstitial, check `user_preferences.dual_role_destination`. If set, redirect immediately. The existing `getUserRedirectPath()` function will be updated to check this field for dual-role users.

### Files Modified

- **Migration**: Add `dual_role_destination` column to `user_preferences`
- **`src/pages/UnifiedLogin.tsx`**: All UI and logic changes
  - `DualRoleInfo` gains `orgName?: string`
  - `checkDualRoleStatus()` selects `slug, name` from organizations
  - New `getDualRolePreference()` helper queries saved preference
  - Interstitial card shows org name + "Remember my choice" checkbox
  - Button click handler persists preference when checkbox is checked
  - Post-login flow checks saved preference before showing interstitial

### Technical Notes

- `dual_role_destination` is a simple text field (`'platform'` | `'org_dashboard'` | null) — no enum needed since it's UI-only preference
- Users can change their default later via a "Change default login destination" option in settings (future enhancement)
- No RLS changes needed — `user_preferences` already has user-scoped policies

