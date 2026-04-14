

# Make NeverDown Payments Section Reader-Model-Aware

## Problem
The Connectivity tab currently shows "WiFi + Cellular" failover as if all readers support it. Only the S710 has cellular. The S700 relies solely on store-and-forward when WiFi drops. The copy also doesn't clarify the risk difference between real-time cellular auth and deferred store-and-forward auth.

## Changes

### 1. Pass reader data to ZuraPayConnectivityTab
**File:** `src/components/dashboard/settings/TerminalSettingsContent.tsx`

Pass the `readers` array as a prop to `ZuraPayConnectivityTab` so it can detect which device types are registered.

### 2. Rewrite NeverDown section with model awareness
**File:** `src/components/dashboard/settings/terminal/ZuraPayConnectivityTab.tsx`

Accept `readers` prop. Derive a boolean `hasS710` by checking if any reader has `device_type === 'stripe_s710'`.

**When S710 is present** — show all three feature cards:
- **WiFi + Cellular** — "Real-time authorization continues over cellular when WiFi drops. Payments are approved or declined instantly — no deferred risk."
- **Store-and-Forward** — "Last-resort fallback during total outages. Payments are stored on-device and authorized when connectivity returns. Small risk of post-service declines."
- **Revenue Protected** — unchanged

**When only S700** — show two feature cards (drop the cellular card):
- **Store-and-Forward** — same copy as above
- **Revenue Protected** — unchanged
- Add a subtle note: "Upgrade to the S710 for cellular failover with real-time authorization."

Update the intro paragraph to be model-aware as well, removing the "cellular failover" claim when no S710 is present.

### 3. Grid layout adjustment
Use `sm:grid-cols-3` when S710 present (3 cards), `sm:grid-cols-2` when S700-only (2 cards) for balanced layout.

