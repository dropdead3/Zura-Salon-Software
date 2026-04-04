

## Login Architecture: Unified vs Separate

### Current State (Already Correct)

Your `UnifiedLogin.tsx` already handles both user types with a **single login form**. After sign-in, `getUserRedirectPath()` checks:
1. Does the user have `platform_roles`? Route to `/platform/overview`
2. Does the user have a custom landing page? Use that
3. Otherwise, route to org dashboard

### Why a Single Login is Better Than Two

Separate login pages create problems:
- Users forget which login to use (support burden)
- Same email/password works on both -- confusing to have two doors to the same lock
- Platform admins who also own organizations would need to remember which page does what
- Two pages to maintain, style, and secure

The current unified approach is the correct pattern for multi-tenant platforms. Slack, Notion, and similar platforms use one login and route based on role/membership.

### What Could Be Improved (No Separate Pages Needed)

1. **Post-login disambiguation** -- If a user has BOTH platform roles AND org membership, show a brief "Where do you want to go?" interstitial after login (platform admin view vs org dashboard). This already partially exists via the multi-org switcher.

2. **Contextual messaging** -- If someone arrives at `/login` from a platform admin link vs an org dashboard link, the subtitle could adapt ("Sign in to manage your organization" vs "Sign in to the Zura Platform") based on the `from` state. No separate page needed.

3. **Sign-up gating** -- The current sign-up form shows a role selector, which is org-facing. Platform admin accounts should only be created via invitation (which is already enforced via `platformInvitationToken`). Consider hiding the public sign-up toggle entirely unless there is an active staff or platform invitation, to prevent orphan accounts.

### Recommendation

Keep the single `/login` page. No architectural change needed. The smart routing is already in place. If you want contextual copy changes based on where the user came from, that is a small UI tweak, not a structural change.

### Technical Details

- `getUserRedirectPath()` in `UnifiedLogin.tsx` (line 49-66) already handles role-based routing
- Platform invitation flow (line 117-122, 138-150) correctly channels platform admin signups
- Staff invitation flow handles org-level signups
- No new pages, routes, or database changes required

