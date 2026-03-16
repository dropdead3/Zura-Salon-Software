

# Auto-Enable Locations When Master Switch is Turned On

## Problem

Turning on the org master switch leaves all per-location access toggles off, creating a confusing state where the feature appears enabled but nothing actually works.

## Solution

When the master switch is toggled ON, automatically create active entitlements for all locations in that org. This makes the action feel cohesive — "enable Backroom" means the org and all its locations get access immediately.

When the master switch is toggled OFF, the existing behavior (disabling the org flag) is sufficient since the dual-check in `useBackroomEntitlement` already blocks access when the org flag is off.

## Changes

### File: `src/components/platform/backroom/BackroomEntitlementsTab.tsx`

In the `toggleBackroom` function (lines 194-211), after successfully enabling the flag:

1. Fetch all active locations for the org
2. Upsert an active entitlement for each location that doesn't already have one
3. Invalidate the entitlement queries so the expanded panel reflects the new state
4. Update the success toast to say "Backroom enabled for {name} — all locations activated"

This keeps the logic self-contained in the existing toggle handler without needing new hooks or UI elements.

