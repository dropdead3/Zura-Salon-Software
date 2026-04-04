

## Login UX Enhancements

Three targeted improvements to the unified login page — no new pages or routes needed.

### 1. Post-Login Interstitial for Dual-Role Users

**Problem**: Users who hold both platform roles AND org membership are silently routed to `/platform/overview`, with no way to choose their org dashboard instead.

**Solution**: After login, if the user has both platform roles and org membership, show a brief "Where do you want to go?" card with two options:
- **Platform Admin** → `/platform/overview`
- **Organization Dashboard** → `/org/:slug/dashboard`

This replaces the current auto-redirect in `getUserRedirectPath()`. Users with only one context still get auto-redirected.

**Implementation**:
- Add a `dualRoleInterstitial` state to `UnifiedLogin.tsx`
- After login, check both `platform_roles` and org membership
- If both exist, show a selection card instead of redirecting
- Selection stores preference in `user_preferences` for future logins (skip interstitial next time, with a "Change default" option in settings)

### 2. Contextual Subtitle Based on Referral Source

**Problem**: The subtitle always says "Sign in to access your dashboard" regardless of where the user came from.

**Solution**: Use the `location.state.from` pathname to adapt the subtitle:
- From `/platform/*` → "Sign in to the Zura Platform"
- From `/org/*/dashboard/*` → "Sign in to manage your organization"
- From staff invitation → "Sign in to join your team"
- Default → "Sign in to access your dashboard"

**Implementation**:
- Add a `getContextualSubtitle()` function in `UnifiedLogin.tsx`
- Reads `location.state.from?.pathname` and `staffInvitation` presence
- Returns appropriate subtitle string
- Replace the static subtitle at line 345

### 3. Hide Sign-Up Unless Invitation Token Present

**Problem**: The Sign Up button and toggle are always visible, allowing anyone to create an account without an invitation. This can create orphan accounts with no organization attachment.

**Solution**: Only show sign-up UI when a valid invitation token is present (either `staffInvitation` or `platformInvitationToken`).

**Implementation**:
- Compute `canSignUp = !!staffInvitation || !!platformInvitationToken`
- Hide the "Sign Up" button (line 517-524) when `!canSignUp`
- Hide the "Don't have an account?" toggle (line 568) when `!canSignUp`
- If someone arrives at `/login` without a token, they only see login + forgot password
- Staff invitation check still runs on email input — if a pending invitation is found, the sign-up option appears dynamically

### Files Modified

- `src/pages/UnifiedLogin.tsx` — all three changes consolidated here

### Technical Notes

- The dual-role check queries both `platform_roles` and `employee_profiles` (for org membership) — two small queries that already exist in the codebase
- No database migrations needed
- No new components — all changes are within the existing login page

