

# Simplify Fleet Tab: Remove Terminal Locations, Add Point-of-Sale Reader Management

## Problem

The "Terminal Locations" card exposes Stripe's internal `tml_` object concept to operators, who have no reason to know about it. The operator is already toggled into "North Mesa" — showing them another card called "Terminal Locations" with "North Mesa" listed again is confusing and redundant.

What operators actually need: **How many readers does this location need?** One reader per point of sale. That's it.

## Changes

### 1. Remove the Terminal Locations card entirely
**File:** `ZuraPayFleetTab.tsx` (lines 562-632)

Delete the entire "Terminal Locations" card. The Stripe terminal location is an infrastructure detail — it's already auto-created behind the scenes. Operators never need to see, create, or delete `tml_` objects.

### 2. Remove the delete-location button and trash icons for terminal locations
Since terminal locations are invisible infrastructure, operators can't delete them. The delete action on `tml_` objects is removed from the UI.

### 3. Simplify the Readers card
**File:** `ZuraPayFleetTab.tsx` (lines 646-762)

- Remove the guard that disables "Register Reader" when no terminal locations exist (since one always exists after connection)
- Update the empty state text from "Create a terminal location first, then register readers" to "No readers paired yet. Register a reader using its pairing code."
- The reader registration flow already works — it just needs to auto-target the single terminal location

### 4. Remove Terminal Locations column from Fleet Overview
**File:** `ZuraPayFleetTab.tsx` (lines 386-392, 116)

In the "All Locations" summary grid, remove the "Terminal Locations" column (currently column 3 of 5). Change to a 4-column grid: Location | Connection | Readers | Status.

### 5. Clean up props
**File:** `ZuraPayFleetTab.tsx` props interface + `TerminalSettingsContent.tsx`

Remove `onDeleteLocation` prop since it's no longer needed from the UI. Keep the underlying `useDeleteTerminalLocation` hook for programmatic cleanup if needed.

## What stays the same
- Auto-creation of the Stripe terminal location on connect (already implemented)
- Deduplication guard in the edge function (already implemented)
- Reader registration, refresh, and deletion
- The "Disconnect location" link at the bottom

## Summary

| Action | File |
|--------|------|
| Remove Terminal Locations card | `ZuraPayFleetTab.tsx` |
| Remove "Terminal Locations" column from Fleet Overview | `ZuraPayFleetTab.tsx` |
| Simplify Readers card empty state and button guard | `ZuraPayFleetTab.tsx` |
| Clean up unused props | `ZuraPayFleetTab.tsx`, `TerminalSettingsContent.tsx` |

