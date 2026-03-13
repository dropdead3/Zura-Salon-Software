

# Fix: Backroom Overview Blank Page

## Problem

The Overview tab is empty because all backroom queries depend on `effectiveOrganization?.id` from the Organization context. You're detected as a **platform user** (platform_owner role), which means the `currentOrganization` query is disabled. Since you haven't selected an organization via the org switcher, `effectiveOrganization` is `null` — so all queries are disabled and the Overview returns `null`.

This affects: Overview health check, backroom settings, and any other backroom section using `useOrganizationContext().effectiveOrganization`.

## Fix

**Two changes:**

### 1. BackroomSetupOverview — Show a prompt when no org is selected
Instead of silently returning `null` when there's no health data, show a message telling the user to select an organization (for platform users) or show a loading/empty state.

### 2. BackroomSettings page — Auto-resolve org for platform users who own one org
Update `useBackroomSetupHealth` and the Overview to fall back to the user's own `organization_id` from their employee profile when `effectiveOrganization` is null. This mirrors how other pages handle platform users who are also salon owners.

**Specifically:**
- In `BackroomSetupOverview.tsx`: When `health` is null and org context has no effective org, show a card prompting org selection (or auto-select if only one org exists)
- In `useBackroomSetupHealth.ts`: Add a fallback — if `effectiveOrganization` is null, try fetching orgId from the user's employee profile `organization_id` field
- Apply the same fallback pattern to `useBackroomSetting` calls on this page

### Files to modify
| File | Change |
|------|--------|
| `src/hooks/backroom/useBackroomSetupHealth.ts` | Add org fallback from employee profile when effectiveOrganization is null |
| `src/components/dashboard/backroom-settings/BackroomSetupOverview.tsx` | Show "Select an organization" prompt instead of returning null |

