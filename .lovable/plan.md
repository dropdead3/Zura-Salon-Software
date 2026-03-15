

# Show Backroom Paywall When No Locations Are Entitled

## Problem

The current `useBackroomEntitlement()` hook (called without a `locationId`) only checks the org-level `backroom_enabled` feature flag. The platform has the master switch ON for Drop Dead Salons, but both locations show "Inactive" / 0 of 2 active. Since the org flag is enabled, the paywall is bypassed and the user lands directly in Backroom Settings — even though they can't actually use anything because no locations are entitled.

## Solution

Update `useBackroomEntitlement` so that when called without a `locationId`, it also checks whether **at least one location** has an active entitlement. If the org flag is on but zero locations are active, the paywall should still appear — showing the user their location access status and how to activate.

Additionally, enhance `BackroomPaywall` to show a clear "location access status" section so the org admin can see which locations are inactive and understand why they're seeing the paywall.

## Changes

### 1. `src/hooks/backroom/useBackroomEntitlement.ts`
- When no `locationId` is provided, add a secondary check: `orgEnabled && activeCount > 0`
- This means the paywall shows when either the org flag is off OR no locations have been activated by the platform admin

### 2. `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`
- Add a status banner at the top when the org master switch is ON but no locations are entitled, explaining: "Your organization has Backroom enabled, but no locations have been activated yet. Contact your Zura representative to activate your locations."
- Show each location's current entitlement status (active/inactive badge) in the location selector section, so the admin can see what the platform has granted vs. what's pending
- Differentiate between two paywall states:
  - **No subscription at all**: Show full pricing/checkout flow (current behavior)
  - **Enabled but no locations active**: Show a "pending activation" state with a contact CTA instead of checkout, since location activation is a platform-admin action

### 3. Files

| File | Action |
|------|--------|
| `src/hooks/backroom/useBackroomEntitlement.ts` | Update no-locationId path to require `activeCount > 0` |
| `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` | Add location status awareness and "pending activation" variant |

