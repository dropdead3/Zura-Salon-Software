

# Add Hardware Tab CTA to Empty Reader State

## Problem
When a location has no readers, the empty state just says "No readers paired yet" — but doesn't tell the operator **how to get a reader**. It should guide them to the Hardware tab to order one.

## Change

**File:** `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` (lines 582-588)

Update the empty state in the Terminal Readers card to:
1. Change copy to explain they need to acquire a reader first
2. Add a "Order Hardware" button/link that switches to the Hardware tab via URL params (`?category=terminals&subtab=hardware`)
3. Keep the existing "Register Reader" button for users who already have a reader with a pairing code

The link will use `useSearchParams` to update the `subtab` param to `hardware`, matching the existing `handleTabChange` pattern in `TerminalSettingsContent.tsx`.

### Updated empty state layout:
- Icon (Smartphone)
- Heading: "No readers paired to this location"
- Description: "Need a reader? Order one from the Hardware tab, then register it here using its pairing code."
- Two buttons: **"Order Hardware"** (navigates to Hardware subtab) and **"Register Reader"** (opens registration dialog)

### Technical detail
- Import `useSearchParams` from `react-router-dom` in `ZuraPayFleetTab.tsx`
- The "Order Hardware" button sets `subtab=hardware` on the current URL params, which `TerminalSettingsContent` already watches to drive the active tab

