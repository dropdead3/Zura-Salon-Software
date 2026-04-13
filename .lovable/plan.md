

# Zura Pay Configurator — Self-Contained Location Management

## Problem
The Zura Pay configurator currently filters locations by `stripe_account_id IS NOT NULL`. When no locations are connected, users see a dead-end empty state directing them to "Integrations" — but Zura Pay was already removed from Integrations. All Zura Pay management must be self-contained within this page.

## Solution
Fetch ALL org locations regardless of Stripe connection status, show connection status per location, and provide setup guidance within the configurator itself. Locations without `stripe_account_id` are shown as "not connected" with clear indicators — no more redirecting users elsewhere.

## Changes

### 1. Fetch all org locations (not just connected ones)
**File:** `src/components/dashboard/settings/TerminalSettingsContent.tsx`

Change `useZuraPayLocations` to remove the `.not('stripe_account_id', 'is', null)` filter. Also add `stripe_account_id`, `stripe_status`, and `stripe_payments_enabled` to the select. This means the configurator shows all locations, whether connected or not.

### 2. Replace the dead-end empty state
**File:** `src/components/dashboard/settings/TerminalSettingsContent.tsx`

Remove the "No Zura Pay Locations" empty state that references Integrations. Instead, always render the tabs — the Fleet tab will differentiate between connected and unconnected locations.

If the org has zero locations at all, show an empty state directing to "Locations" settings to create one first.

### 3. Add connection status indicators to Fleet tab
**File:** `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`

- Add a connection status badge next to each location in the picker and summary: green "Active" for connected (`stripe_account_id` present + `stripe_status === 'active'`), amber "Pending" for in-progress, and outline "Not Connected" for unconnected locations.
- When a user selects an unconnected location, show an informational card instead of the terminal locations/readers cards: "This location is not yet connected to Zura Pay. Contact your account manager to enable payment processing."
- In the All Locations summary, add a "Status" column showing connection state per location.
- Location picker dropdown items get small status dots (green/gray) for quick visual scanning.

### 4. Update FleetTab props
**File:** `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx`

Update the `locations` prop type to include `stripe_account_id: string | null`, `stripe_status: string | null`, and `stripe_payments_enabled: boolean | null` so the tab can render connection state.

### 5. Guard terminal operations for unconnected locations
**File:** `src/components/dashboard/settings/TerminalSettingsContent.tsx`

Disable "Create Terminal Location" and "Register Reader" actions when the selected location has no `stripe_account_id`. The edge function already rejects these — this prevents confusing error messages.

### 6. Update Hardware tab guard
**File:** `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx`

Show hardware purchasing regardless of location connection status (ordering hardware can happen before connecting). No change needed if it already works this way — just verify.

## Files Modified
| File | Action |
|------|--------|
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Remove `stripe_account_id` filter from query, update empty state logic, pass connection data to Fleet tab |
| `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` | Add connection status badges, guard actions for unconnected locations, status column in summary |

## Technical Details
- No migrations — all data already exists in the `locations` table
- No edge function changes — the `manage-stripe-terminals` edge function already validates `stripe_account_id` server-side
- The location picker now shows all locations with visual status indicators
- Terminal location/reader CRUD is only enabled for connected locations (UI-level guard matching existing server-side guard)
- `stripe_account_id` connection is handled externally (platform admin provisioning) — this plan does not add self-service Stripe Connect onboarding, just removes the broken "go to Integrations" reference

