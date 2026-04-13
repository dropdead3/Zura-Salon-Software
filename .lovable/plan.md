

# Offline Payments & S710 Terminal Feature

## Overview

Three interconnected deliverables:
1. Lock terminal hardware to **S710 only** (cellular failover)
2. Build **offline payment resilience** into the Zura dashboard — store-and-forward awareness, offline status banners, and payment queue visibility
3. Add a **marketing section** to the PlatformLanding page highlighting offline payment protection as a key differentiator

## Important Context

The S710 smart reader handles offline payments natively via Stripe's **store-and-forward** capability. When internet drops, the reader stores card data locally, then forwards payments automatically when connectivity returns. This is hardware-level — Zura's role is to:
- Surface offline status clearly to salon staff
- Track which payments are pending forward
- Provide confidence that nothing is lost
- Market this as a solved problem

## Architecture

```text
S710 Reader (hardware)
├── Cellular failover (Ethernet → WiFi → Cellular)
├── Store-and-forward (Stripe SDK native)
└── Offline payment storage on device

Zura Dashboard (software)
├── Offline status banner (enhanced OfflineIndicator)
├── Payment queue visibility (pending forwards)
└── Offline event logging to terminal_hardware_requests

Marketing Site
└── New "NeverDown Payments" section on PlatformLanding
```

## Changes

### 1. Terminal Request Form — S710 Only
**File:** `src/components/dashboard/settings/TerminalSettingsContent.tsx`

- Remove device type ambiguity — hardcode device as "Stripe Reader S710"
- Update the request dialog description to reference S710 with cellular failover
- Add a small info callout in the request form: "The S710 includes cellular connectivity, ensuring payments continue even when WiFi is down."
- Update `REASON_OPTIONS` if needed to include "upgrade_to_s710" for orgs replacing non-cellular readers

### 2. Offline Payment Awareness Dashboard
**File:** `src/components/dashboard/settings/OfflinePaymentStatus.tsx` (new)

A new component rendered inside the Terminals settings area showing:
- Current connectivity status (online/offline/cellular-fallback)
- Count of payments pending forward (if any)
- Last successful sync timestamp
- Visual timeline of offline events (when internet dropped, when it recovered, how many payments were queued)

This uses the existing `useOfflineStatus` hook enhanced with:
- Offline duration tracking
- Event log (stored in localStorage)

**File:** `src/hooks/useOfflineStatus.ts` (modify)
- Add `offlineEvents` array tracking start/end/duration of each offline period
- Add `offlineDuration` (current session if offline)
- Persist events to localStorage for cross-session visibility

### 3. Enhanced Service Worker for Offline Resilience
**File:** `public/sw.js` (modify)

- Add caching for the terminal settings and payment-related API routes
- Add `sync-offline-payments` background sync tag
- Cache the dashboard shell more aggressively so the app loads even fully offline

### 4. Offline Payment Queue Tracker
**File:** `src/hooks/useOfflinePaymentQueue.ts` (new)

A specialized hook that:
- Listens for offline payment events (simulated via the existing `useOfflineSync` pattern)
- Tracks payments that were collected offline and are pending forward
- Shows count, total amount, and estimated forward time
- Clears automatically when payments are forwarded (online restored)

This is primarily a **visibility layer** — the actual store-and-forward is handled by Stripe's Terminal SDK on the S710. This hook gives salon operators confidence by showing them what's happening.

### 5. Marketing Section — "NeverDown Payments"
**File:** `src/components/marketing/NeverDownPayments.tsx` (new)

A premium marketing section for the PlatformLanding page. Design follows the existing cinematic aesthetic (violet gradients, dark glass cards, scroll-reveal animations).

Content structure:
- **Headline:** "The WiFi went down. Your revenue didn't."
- **Subhead:** "Every salon has lived this nightmare. A packed Saturday, the internet drops, and suddenly you can't take payments. With Zura Pay and the S710, that scenario is over."
- **Three-column feature grid:**
  1. **Cellular Failover** — "The S710 automatically switches from WiFi to cellular. No manual intervention. No downtime."
  2. **Store & Forward** — "If all connectivity is lost, payments are stored securely on the device and forwarded automatically when connection returns."
  3. **Real-Time Visibility** — "Your dashboard shows exactly how many payments are queued, when they'll sync, and confirms when everything clears."
- **Visual:** Animated split showing "WiFi Down" (red) transitioning to "Payments Still Processing" (green) — similar to the ChaosToClarity pattern
- **Social proof callout:** "Zero lost payments across all Zura Pay locations."
- **CTA:** "See Zura Pay in Action" → links to /demo

**File:** `src/pages/PlatformLanding.tsx` (modify)
- Import and place `NeverDownPayments` section after `ToolConsolidation` and before `ZuraInANutshell`

### 6. Edge Function Update — S710 References
**File:** `supabase/functions/manage-terminal-requests/index.ts` (modify)
- Add `device_type: 's710'` as default metadata on all new requests
- Include device type in the response payload for platform admin visibility

## Files Summary

| File | Action |
|---|---|
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Modify — S710 only, updated copy |
| `src/components/dashboard/settings/OfflinePaymentStatus.tsx` | Create — Offline status + payment queue visibility |
| `src/hooks/useOfflineStatus.ts` | Modify — Add event logging + duration tracking |
| `src/hooks/useOfflinePaymentQueue.ts` | Create — Payment forward queue tracker |
| `public/sw.js` | Modify — Enhanced caching for offline resilience |
| `src/components/marketing/NeverDownPayments.tsx` | Create — Marketing section |
| `src/pages/PlatformLanding.tsx` | Modify — Add NeverDownPayments section |
| `supabase/functions/manage-terminal-requests/index.ts` | Modify — S710 default device type |

8 files (3 new, 5 modified). No database changes. No new dependencies.

