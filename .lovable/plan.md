

## Consolidate Invite & Manage Invitations into Onboarding Hub

Good prompt -- you're reducing navigation sprawl by co-locating invitation workflow with onboarding, which is the natural next step after inviting someone. One note: the invitation management UI already exists fully in the Access Hub's Invitations tab (`InvitationsTab.tsx`, 875 lines). Rather than duplicating that, the cleanest approach is to add tabs to the Onboarding Hub that embed the existing components.

### Current State

- **Invite Team Members**: `ManagementInviteDialog` component renders as a card in TeamHub and ManagementHub
- **Manage Invitations**: Cards in TeamHub/ManagementHub link to `/dashboard/admin/account-management` (broken route -- doesn't exist)
- **Onboarding Hub** (`OnboardingTracker.tsx`): Currently a single-view page with no tabs -- shows onboarding progress tracking only
- **Access Hub**: Has a full `InvitationsTab` component at `access-hub?tab=invitations`

### Plan

**1. Add tab navigation to OnboardingTracker.tsx**

Convert the Onboarding Hub from a single view into a tabbed layout with:
- **Progress** tab (default) -- existing onboarding tracker content
- **Invitations** tab -- embeds the existing `InvitationsTab` component from Access Hub

Add an "Invite Team Member" button in the page header (uses `ManagementInviteDialog` with a button trigger).

**2. Update hub card links in TeamHub.tsx**

- Remove standalone `ManagementInviteDialog variant="card"` from People & Development section
- Change "Manage Invitations" card href from `/dashboard/admin/account-management` to `/dashboard/admin/onboarding-tracker?tab=invitations`
- Optionally keep the invite card or merge it into the "Onboarding Hub" gateway card description

**3. Update hub card links in ManagementHub.tsx**

- Remove the entire "Team Invitations" `CategorySection` (contains `ManagementInviteDialog` and "Manage Invitations" card)
- The Onboarding Hub card already exists in Team Development section -- update its description to mention invitations

**4. Add redirect for old route**

- Add a route for `/dashboard/admin/account-management` in `App.tsx` that redirects to `/dashboard/admin/onboarding-tracker?tab=invitations`

**5. Keep Access Hub invitations tab**

- The Access Hub Invitations tab stays as-is for governance/admin-level access -- it's the right home for role-based account management
- The Onboarding Hub reuses the same component, providing a workflow-oriented entry point

### Files Touched

- `src/pages/dashboard/admin/OnboardingTracker.tsx` -- add tabs, embed `InvitationsTab`, add invite button in header
- `src/pages/dashboard/admin/TeamHub.tsx` -- remove invite card + update manage invitations link
- `src/pages/dashboard/admin/ManagementHub.tsx` -- remove Team Invitations section
- `src/App.tsx` -- add redirect route for `/dashboard/admin/account-management`

