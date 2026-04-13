

# Zura Pay — Sixth-Pass Audit

## Bugs

### B1: `verify-zura-pay-connection` update call missing row-count validation
**File:** `supabase/functions/verify-zura-pay-connection/index.ts` (line 91-93)
The status update fires without checking if the update succeeded. If the `organizations` table has RLS that blocks the service-role update (unlikely but defensive), the status silently drifts. More importantly, the `{ count: 'exact' }` option was called out in pass 2 but never applied.
**Fix:** Add `{ count: 'exact' }` and log a warning if `count === 0`.

### B2: `RegisterReaderDialog` receives empty string `locationId` when no location selected
**File:** `TerminalSettingsContent.tsx` (line 404)
`locationId={activeLocationId || ''}` — if `activeLocationId` is null, the dialog passes `""` to `useRegisterReader`, which sends `location_id: ""` to the edge function. The dialog itself is guarded by `terminalLocations.length === 0` check, but the mutation can still fire with an empty `locationId`.
**Fix:** Disable the "Register Reader" button in the Fleet tab when `activeLocationId` is null. Already partially gated (line 490 checks `terminalLocations?.length`) but add an explicit `!activeLocationId` guard.

### B3: `useTerminalRequests` Realtime channel created before org connection is verified
**File:** `src/hooks/useTerminalRequests.ts` (line 32-51)
The hook sets up a Realtime channel whenever `orgId` is truthy, regardless of whether the org has an active connection. In `ZuraPayHardwareTab`, the hook receives `isOrgConnected ? orgId : undefined`, so this is mitigated. But direct callers (e.g., platform admin views) could create channels prematurely.
**Status:** Low risk — accepted. No change needed.

### B4: Stripe import path inconsistency across edge functions
`terminal-hardware-order` uses `https://esm.sh/stripe@18.5.0` (no `?target=deno`), while `connect-zura-pay` and `verify-zura-pay-connection` use `https://esm.sh/stripe@18.5.0?target=deno`. The `?target=deno` ensures Deno-compatible output. Without it, the import may pull Node-targeted code that works by accident in the Deno runtime but could break on edge runtime updates.
**Fix:** Add `?target=deno` to the Stripe import in `terminal-hardware-order/index.ts`.

## Gaps

### G1: No error boundary wrapping tab content
**File:** `TerminalSettingsContent.tsx` (lines 354-397)
If `ZuraPayConnectivityTab` or `ZuraPayDisplayTab` throw during render (e.g., S710 simulator edge case), the entire settings page crashes. Each `TabsContent` child should be wrapped in an error boundary.
**Fix:** Create a lightweight `TabErrorBoundary` component and wrap each tab's content.

### G2: `createCheckout` mutation has no loading toast/overlay
When `handlePurchase` fires, the dialog closes immediately (line 88) but the checkout mutation is still in-flight. There's a 2-5 second window where the user sees the Hardware tab with no feedback before the browser navigates.
**Fix:** Show a toast: "Redirecting to secure checkout…" after dialog close and before navigation.

### G3: `activeTab` not synced to URL — tab state lost on refresh
**File:** `TerminalSettingsContent.tsx` (line 224)
`activeTab` defaults to `'fleet'` on every mount. If a user refreshes the page while on the Hardware tab, they return to Fleet. Syncing `activeTab` with a `subtab` search param would preserve state.
**Fix:** Read initial `activeTab` from `searchParams.get('subtab')` and update the param on tab change.

### G4: Hardware order history doesn't show `hardware_orders` — only `terminal_hardware_requests`
The verify_payment flow writes to `hardware_orders` table, but the Hardware tab UI queries `terminal_hardware_requests`. These are separate tables. A completed checkout appears in `hardware_orders` but the user only sees the "request" record (which may still show "pending"). There's no UI to show confirmed orders from `hardware_orders`.
**Fix:** Either merge the display (query both tables) or update the `terminal_hardware_requests` status to "approved" upon successful checkout verification. The latter is simpler and keeps the single-source display.

## Enhancements

### E1: Differentiate pending copy using `details_submitted`
The Fleet tab pending state (line 322-324) shows generic "being verified" copy. The verify edge function returns `details_submitted`. Store this value and show "You haven't completed the onboarding form yet — click Continue Onboarding to resume" when `details_submitted` is false, vs "Your information is under review" when true.

---

## Immediate Changes

| File | Change |
|------|--------|
| `supabase/functions/terminal-hardware-order/index.ts` | Add `?target=deno` to Stripe import (B4) |
| `supabase/functions/verify-zura-pay-connection/index.ts` | Add `{ count: 'exact' }` to update and log warning (B1) |
| `TerminalSettingsContent.tsx` | Sync `activeTab` with `subtab` URL param (G3); wrap tab content in error boundaries (G1); add "Redirecting…" toast after checkout dialog close (G2) |
| `ZuraPayHardwareTab.tsx` | After successful `verifyPayment`, update the matching `terminal_hardware_requests` status to reflect checkout completion (G4) |

0 migrations, 0 new edge functions, 0 new dependencies.

