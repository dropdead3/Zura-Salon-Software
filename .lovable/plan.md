

# Fix: Checkout Blocked for Platform Users Who Also Own an Org

## Root Cause

`BackroomPaywall` reads `effectiveOrganization` from `useOrganizationContext()`. For platform users (like you — both platform admin and Drop Dead owner), `effectiveOrganization` returns `null` unless you've explicitly selected an org via the org switcher. This is by design for platform-wide views, but it breaks checkout because `handleCheckout` guards on `!effectiveOrganization?.id`.

The parent page (`BackroomSettings.tsx`) already solves this with `useBackroomOrgId()` which falls back to `employee_profiles.organization_id`. But `BackroomPaywall` doesn't use that hook.

## Fix

**File:** `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

1. Import `useBackroomOrgId` and use it as the resolved org ID
2. Replace `effectiveOrganization?.id` with the resolved `orgId` from `useBackroomOrgId()` for:
   - The `useLocations` call
   - The `useBackroomLocationEntitlements` call
   - The `handleCheckout` guard and body payload
   - The `organizationId` prop passed to `BackroomCheckoutConfirmDialog`
3. Keep `effectiveOrganization` only if needed for display (org name, etc.) — otherwise remove it

This mirrors the pattern already used in `BackroomSettings.tsx` (line 117) and `useBackroomEntitlement.ts`.

## Why This Works

`useBackroomOrgId` checks `effectiveOrganization` first, then falls back to querying `employee_profiles` for the user's org. Since you're both a platform admin and an org owner, the fallback resolves your org correctly — unblocking checkout without affecting the platform-wide view logic for other pages.

