

# Zura Pay — Third-Pass Audit

## Critical Bug

### B1: Return URLs use hardcoded `/dashboard/admin/settings` — breaks org-scoped routing
**Severity: Critical — onboarding flow is broken for all org-scoped users.**

The user is on `/org/drop-dead-salons/dashboard/admin/settings`. When they click "Start Setup," the return/refresh URLs are built as:
```
${window.location.origin}/dashboard/admin/settings?tab=terminals&zura_pay_return=true
```
This is a non-org-scoped path. When Stripe redirects back, the user hits a route that either 404s or loses org context — the `useEffect` handler in `TerminalSettingsContent` never fires correctly because `orgId` resolves to undefined.

The edge function fallback URLs have the same problem (hardcoded `/dashboard/admin/settings`).

**Fix:** Use `window.location.pathname` (which already contains the full org-scoped path) instead of hardcoding. The simplest correct approach:
- Frontend: `${window.location.origin}${window.location.pathname}?tab=terminals&zura_pay_return=true`
- Edge function fallback: Keep as-is (it's already a fallback behind the frontend-provided URL, so the fix at the call site is sufficient).

**Files:** `TerminalSettingsContent.tsx` (lines 348-349)

### B2: Hardware checkout `success_url` also uses wrong routing pattern
**File:** `supabase/functions/terminal-hardware-order/index.ts` (line 295)

The checkout success URL constructs the path as `/org/${slug}/settings?tab=terminals` but the actual route is `/org/${slug}/dashboard/admin/settings`. This means hardware checkout returns also break.

**Fix:** The edge function should accept `success_url` and `cancel_url` from the client (which knows the correct current path) rather than constructing them server-side. Alternatively, fix the path construction.

**File:** `supabase/functions/terminal-hardware-order/index.ts`

## Bugs

### B3: `useEffect` return handler can double-fire on `searchParams` update race
**File:** `TerminalSettingsContent.tsx` (line 227-241)

The effect reads `searchParams`, cleans them, then calls verify. But `setSearchParams` triggers a re-render with new `searchParams`, and the effect re-runs. The old params may still be in flight during React's batching window. Unlike the Hardware tab (which has `hasVerifiedCheckout` ref guard), this handler has no idempotency guard.

**Fix:** Add a `useRef` flag (`hasVerifiedReturn`) similar to the Hardware tab pattern.

### B4: `useTerminalHardwareSkus()` hook called unconditionally
**File:** `ZuraPayHardwareTab.tsx` (line 40)

The SKU fetch fires even when `isOrgConnected` is false (the gate is on line 143, after all hooks). React hooks can't be called conditionally, but `useTerminalHardwareSkus` should accept an `enabled` parameter.

**Fix:** Pass `enabled` option: `useTerminalHardwareSkus('US', isOrgConnected)` — update the hook to accept and forward the enabled flag.

### B5: `useTerminalRequests` query fires without org connection check
Same issue as B4 — `useTerminalRequests(orgId)` on line 39 fires regardless of connection status.

**Fix:** Pass `enabled: isOrgConnected` or conditionally disable via the hook.

## Gaps

### G1: No loading/error state shown during connect mutation
When the user clicks "Start Setup," `isConnecting` shows a spinner on the button, but there's no visual feedback if the redirect takes time (e.g., slow Stripe API). If the edge function takes 3-5 seconds, the user may click away.

**Fix:** Consider disabling tab navigation while `isConnecting` is true, or showing a brief "Redirecting to secure setup…" overlay.

### G2: Refresh URL handler doesn't re-initiate onboarding
When Stripe redirects to the refresh URL (Account Link expired), the `useEffect` on line 229 detects `zura_pay_refresh=true` but does nothing with it — it only cleans the param. The user is left on the settings page with no guidance.

**Fix:** When `isRefresh` is true, automatically call `connectMutation.mutate` to generate a fresh Account Link and redirect again. Or show a toast: "Your setup session expired. Click 'Continue Onboarding' to resume."

### G3: `orgConnectStatus` query can return stale data after location connect
After `connectLocationMutation` succeeds, the hook invalidates `org-connect-status` and `zura-pay-locations`. But `isLocationConnected` is derived from the `locations` query data, not `orgConnectStatus`. If the `zura-pay-locations` query hasn't refetched yet, the Fleet tab still shows the "Enable Zura Pay" empty state momentarily.

**Fix:** Add optimistic update to `useConnectLocation` that patches the `zura-pay-locations` query cache inline.

## Changes

| File | Change |
|------|--------|
| `TerminalSettingsContent.tsx` | Fix return URLs to use `window.location.pathname` (B1); add `hasVerifiedReturn` ref guard (B3); handle refresh URL by showing toast or re-initiating (G2) |
| `ZuraPayHardwareTab.tsx` | No changes needed this pass |
| `useTerminalHardwareOrder.ts` | Add `enabled` param to `useTerminalHardwareSkus` (B4) |
| `supabase/functions/terminal-hardware-order/index.ts` | Fix checkout success/cancel URL path (B2) |

0 migrations, 0 new edge functions, 0 new dependencies.

