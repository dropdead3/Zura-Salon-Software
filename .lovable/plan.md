

# Capital Access Control — Owner & Super Admin Gating

## Problem

Capital routes are gated by `manage_settings` permission, which managers can also have. The user's access model is:

- **View Capital (opportunities, projects, settings):** Account Owner + Super Admin only
- **Approve/Initiate funding:** Account Owner only

Currently there is no distinction between viewing and approving, and no `is_primary_owner` check anywhere in the Capital flow.

## Changes

### 1. Route-level gating — `src/App.tsx`

Replace `requiredPermission="manage_settings"` on all 5 Capital routes with `requireSuperAdmin`. This restricts access to `is_super_admin` and `is_primary_owner` users (ProtectedRoute already handles this pattern — it checks `profile?.is_super_admin`, and primary owners are always super admins).

### 2. Funding approval gating — `src/components/dashboard/capital-engine/CapitalFundingConfirmModal.tsx`

Add an `is_primary_owner` check using `useEmployeeProfile()`. If the user is not the Account Owner:
- Disable the "Confirm & Fund" button
- Show a message: "Only the Account Owner can approve funding"

### 3. Funding detail CTA — `src/components/dashboard/capital-engine/FundingOpportunityDetail.tsx`

Same pattern — gate the "Activate Funding" / "Initiate" button behind `is_primary_owner`. Super Admins can view all details but cannot trigger the funding flow.

### 4. Edge function server-side enforcement — `supabase/functions/create-financing-checkout/index.ts`

Currently checks `is_org_admin`. Tighten to also verify `is_primary_owner` from the employee_profiles table before allowing checkout creation. This is the server-side safety net.

### 5. Sidebar visibility — `src/components/dashboard/SidebarNavContent.tsx`

The Capital nav link currently shows based on feature flag + qualifying opportunities. Add a profile check so only `is_super_admin` or `is_primary_owner` users see it. (Managers and other roles should never see the link.)

### 6. Daily briefing capital section — `src/hooks/useDailyBriefingEngine.ts`

Currently shows capital data when `roleContext !== 'stylist'` (line 71). Tighten to only show for super admins and primary owners.

## File Summary

| File | Change |
|---|---|
| `src/App.tsx` | Replace `requiredPermission="manage_settings"` with `requireSuperAdmin` on Capital routes |
| `src/components/dashboard/capital-engine/CapitalFundingConfirmModal.tsx` | Gate "Confirm & Fund" button to `is_primary_owner` only |
| `src/components/dashboard/capital-engine/FundingOpportunityDetail.tsx` | Gate funding initiation CTA to `is_primary_owner` only |
| `supabase/functions/create-financing-checkout/index.ts` | Add `is_primary_owner` server-side check |
| `src/components/dashboard/SidebarNavContent.tsx` | Restrict Capital nav link to super admin / primary owner |
| `src/hooks/useDailyBriefingEngine.ts` | Restrict capital briefing section to super admin / primary owner |

