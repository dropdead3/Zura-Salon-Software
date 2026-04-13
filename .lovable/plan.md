

# Zura Pay — Fourth-Pass Audit

## Bugs

### B1: Brand leakage — "Stripe Reader S710" in edge function fallback
**File:** `supabase/functions/terminal-hardware-order/index.ts` (lines 170, 252)
The fallback SKU data returns `product: "Stripe Reader S710"` and the checkout default item uses `name: "Stripe Reader S710"`. This leaks the processor name into checkout line items visible to org users.
**Fix:** Change to `"Zura Pay Reader S710"` in both places.

### B2: `connectMutation.mutate` called inside `useEffect` without stable reference
**File:** `TerminalSettingsContent.tsx` (line 245)
The refresh handler calls `connectMutation.mutate(...)` directly. Unlike `verifyMutateRef`, this is not wrapped in a ref. Since `connectMutation` is recreated each render, this is a stale closure risk. More critically, `connectMutation` is missing from the `useEffect` dependency array (line 251), so ESLint would flag this.
**Fix:** Add a `connectMutateRef` similar to `verifyMutateRef`, and use it inside the effect.

### B3: `useTerminalRequests` realtime subscription runs even when org is not connected
**File:** `ZuraPayHardwareTab.tsx` (line 39)
The hook receives `isOrgConnected ? orgId : undefined`, which correctly disables the query. However, `useTerminalRequests` also sets up a Supabase Realtime channel inside a `useEffect` keyed on `orgId`. When `orgId` is passed as `undefined`, the channel is skipped (line 33 guard). But if `orgId` resolves before `connectStatus` does, the channel will be created prematurely and the query will fire before connection status is known.
**Status:** Low risk — the query returns empty data. No fix needed, but worth noting.

### B4: Hardware checkout `success_url` missing `checkout` and `session_id` params from client
**File:** `ZuraPayHardwareTab.tsx` (lines 141-142)
The `successUrl` sent to the edge function is `${origin}${currentPath}?tab=terminals` — but the edge function appends `checkout=success&session_id={CHECKOUT_SESSION_ID}` to it. The `tab=terminals` param is present, so the return handler in the Hardware tab should fire. However, the `useEffect` on line 60-71 reads `searchParams.get('checkout')` — this requires the Tabs component to default to the `hardware` tab on return. Currently `defaultValue="fleet"` (line 328 of TerminalSettingsContent). So after checkout, the user lands on the Fleet tab, not Hardware, and the verify effect never fires because the Hardware tab isn't mounted.
**Fix:** Either change the `successUrl` to include `&subtab=hardware` and read it to set the active tab, or move the checkout verification logic up to `TerminalSettingsContent` where it always mounts.

### B5: `terminal-hardware-order` edge function has no Zod input validation
**File:** `supabase/functions/terminal-hardware-order/index.ts`
Unlike `connect-zura-pay` and `verify-zura-pay-connection` which now use Zod, this function parses `body.action` directly without schema validation. Malformed payloads cause unhandled exceptions.
**Fix:** Add Zod schemas per action.

## Gaps

### G1: Checkout return lands on Fleet tab — Hardware tab verify effect never mounts
This is the UX consequence of B4. After a successful hardware checkout, the user returns to the Terminals settings page on the Fleet tab. The `ZuraPayHardwareTab` component is not mounted, so the `useEffect` that reads `checkout=success` never runs. The payment is recorded on the next manual visit to the Hardware tab — if the params are still in the URL.
**Fix:** Lift the checkout return handler to `TerminalSettingsContent` and auto-switch to the Hardware tab when `checkout` param is detected.

### G2: No Zod validation on `terminal-hardware-order` `create_checkout` body
The `create_checkout` action accepts `items` as an array but doesn't validate item structure. Malformed items (missing `amount`, negative quantities) could create invalid Stripe checkout sessions.
**Fix:** Add Zod schema for checkout items.

### G3: Edge function fallback URLs still hardcode `/dashboard/admin/settings`
**File:** `connect-zura-pay/index.ts` (lines 114-115, 170-171)
The fallback URLs (when client doesn't provide `return_url`/`refresh_url`) still use the hardcoded non-org-scoped path. While the client now always passes the correct URLs, if a direct API call is made without them, the fallback breaks.
**Fix:** Accept but this is a defense-in-depth issue. The client always sends the URLs now.

## Enhancements

### E1: Controlled tab state for post-redirect tab switching
Convert the `Tabs` from `defaultValue` to controlled `value` state. This enables programmatic tab switching (e.g., auto-switch to Hardware after checkout return, or to Fleet after connect return).

### E2: Verify `details_submitted` to differentiate pending states
The `verify-zura-pay-connection` edge function already returns `details_submitted` in its response. The Fleet tab pending state could use this to show "You haven't completed the onboarding form yet" vs "Your information is under review" — improving the user experience for abandoned onboarding flows.

---

## Immediate Changes

| File | Change |
|------|--------|
| `supabase/functions/terminal-hardware-order/index.ts` | Fix "Stripe Reader S710" to "Zura Pay Reader S710" (B1); add Zod validation for all actions (B5/G2) |
| `TerminalSettingsContent.tsx` | Add `connectMutateRef` for stable reference in useEffect (B2); lift checkout return handler from HardwareTab and auto-switch to hardware tab (B4/G1/E1); convert Tabs to controlled state |
| `ZuraPayHardwareTab.tsx` | Remove checkout return handler (moved to parent) |

0 migrations, 0 new edge functions, 0 new dependencies.

