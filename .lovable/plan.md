

# Add "Access Denied" Page for Cross-Organization Dashboard URLs

## Problem
When an authenticated user navigates to `/org/some-other-slug/dashboard/...` for an organization they don't belong to, the system currently either shows a broken empty state or falls through to NotFound. There's no clear message explaining the user isn't a member of that organization.

## Approach
Add a membership check in `OrgDashboardRoute` after the organization resolves successfully. Query the user's `employee_profiles` and `organization_admins` to verify they belong to the URL's organization. Platform users bypass this check. If the user isn't a member, render a dedicated `OrgAccessDenied` page instead of `<Outlet />`.

## Changes

### 1. Create `src/components/auth/OrgAccessDenied.tsx`
A friendly, branded access-denied page styled consistently with the existing `AccessDeniedView` pattern:
- Shield icon with the organization name
- Clear message: "You don't have access to this organization's dashboard"
- "Go to My Dashboard" button (navigates to the user's own org dashboard)
- "Back to Home" secondary button
- Uses design tokens, `font-display` for heading, calm/executive tone

### 2. Update `src/components/OrgDashboardRoute.tsx`
- Add a membership query after `useOrganizationBySlug` resolves: check if the authenticated user has a row in `employee_profiles` or `organization_admins` for the resolved `organization.id`
- Platform users (`isPlatformUser` from `useAuth`) skip the membership check entirely
- While the membership check loads, show `ZuraLoader`
- If not a member, render `<OrgAccessDenied>` instead of `<Outlet />`
- If a member, proceed as normal

## Technical Details

**Membership query** (runs only when org is resolved and user is authenticated):
```sql
-- Check employee_profiles
SELECT 1 FROM employee_profiles WHERE user_id = ? AND organization_id = ? LIMIT 1
-- OR check organization_admins
SELECT 1 FROM organization_admins WHERE user_id = ? AND organization_id = ? LIMIT 1
```

Both queries run in parallel. If either returns a row, the user is a member.

**No database changes required** — this uses existing tables and RLS policies.

| File | Change |
|------|--------|
| `src/components/auth/OrgAccessDenied.tsx` | New — friendly access denied page for non-members |
| `src/components/OrgDashboardRoute.tsx` | Add membership check before rendering `<Outlet />` |

