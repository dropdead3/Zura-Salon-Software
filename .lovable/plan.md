

# Zura Pay — Seventh-Pass Audit

## Bugs

### B1: `handlePurchase` fires checkout even when `createRequest` fails
**File:** `ZuraPayHardwareTab.tsx` (lines 109-136)
The `onError` callback of `createRequest.mutate` still proceeds with `createCheckout.mutate`. The comment says "proceeding with checkout anyway," but this means a failed terminal_hardware_requests insert silently results in a checkout with no matching request record. If checkout succeeds and `verify_payment` writes to `hardware_orders`, the two tables are permanently out of sync — the order exists but the request doesn't.
**Fix:** Remove the `onError` fallthrough to `createCheckout`. Instead, show an error toast and abort. If the intent is fire-and-forget for the request, move `createRequest` to fire *after* checkout success (inside the verify flow), not before.

### B2: `verify_payment` records order but never updates `terminal_hardware_requests`
**File:** `terminal-hardware-order/index.ts` (lines 387-407)
The G4 gap from pass 6 was documented but never implemented. After a successful checkout, the edge function inserts into `hardware_orders` but the matching `terminal_hardware_requests` row stays "pending" forever. The Hardware tab UI only queries `terminal_hardware_requests`, so users see a stale "Pending" badge next to a completed purchase.
**Fix:** After inserting into `hardware_orders`, update the matching `terminal_hardware_requests` row (match on `organization_id` + most recent pending request) to status `approved`.

### B3: `connect-zura-pay` fallback URLs still use hardcoded `/dashboard/admin/settings`
**File:** `connect-zura-pay/index.ts` (lines 114-115, 170-171)
Fallback return/refresh URLs use `https://app.getzura.com/dashboard/admin/settings?tab=terminals&...`. This path doesn't exist in org-scoped routing (`/org/{slug}/dashboard/admin/settings`). If a client ever omits the URLs (e.g., direct API call, future admin tool), the redirect breaks completely.
**Fix:** Remove the hardcoded fallback path. Require `return_url` and `refresh_url` in the Zod schema (make them `.url()` required instead of optional). If they're missing, return a 400 error rather than silently redirecting to a broken URL.

### B4: `TabErrorBoundary` doesn't reset when switching tabs
**File:** `TerminalSettingsContent.tsx` (lines 37-60)
If a tab crashes and the user switches to another tab then back, the error boundary still shows the error state because React doesn't unmount `TabsContent` children in Radix — it just hides them with CSS. The error boundary needs a `key` prop tied to the tab name, or it needs to reset its state when the tab re-activates.
**Fix:** Add `key={activeTab === 'fleet' ? 'fleet-active' : 'fleet'}` (or similar) to force remount on tab switch. Simpler alternative: pass `activeTab` as a prop and reset `hasError` in `componentDidUpdate` when the tab becomes active.

## Gaps

### G1: No rate limiting or idempotency key on `create_checkout`
**File:** `terminal-hardware-order/index.ts` (lines 226-336)
A user can click "Proceed to Checkout" multiple times (the button only disables during `isPending`, but network hiccups can cause the first call to appear failed). Each call creates a new Checkout Session and a new `terminal_hardware_requests` row. There's no idempotency key on the Stripe session creation.
**Fix:** Generate an idempotency key from `organization_id + user.id + timestamp_bucket` and pass it as `idempotencyKey` to `stripe.checkout.sessions.create`. On the client, also disable the button immediately via local state (already partially done).

### G2: `useTerminalHardwareSkus` fetches on every Hardware tab mount even when org not connected
**File:** `ZuraPayHardwareTab.tsx` (line 41)
`useTerminalHardwareSkus('US', isOrgConnected)` is correctly gated by `isOrgConnected`. However, on first render, `connectStatus` is undefined (loading), so `isOrgConnected` is `false`, then flips to `true` once loaded. This causes two renders but no wasted fetch — so this is acceptable. No fix needed.

### G3: Checkout `success_url` doesn't include `subtab=hardware`
**File:** `ZuraPayHardwareTab.tsx` (lines 122-123)
The success URL is `${origin}${currentPath}?tab=terminals`. When the user returns, `TerminalSettingsContent` detects `checkout=success` and calls `setActiveTab('hardware')` (line 293). But the URL still shows `subtab` absent (defaults to fleet). If the user copies the URL mid-verify, they'd land on Fleet.
**Fix:** Include `subtab=hardware` in the success URL so the URL is self-documenting and the `useState` initializer picks it up correctly.

### G4: `details_submitted` from verify response not stored or surfaced (carried from pass 4/6)
The Fleet tab pending state (line 322-324) shows generic copy. The verify edge function returns `details_submitted`. This value is not stored client-side.
**Fix:** In `useVerifyZuraPayConnection`, store the verify response data (including `details_submitted`) in a ref or query cache. Pass it to `ZuraPayFleetTab` and conditionally render:
- `details_submitted === false`: "You haven't completed the onboarding form yet — click Continue Onboarding to resume."
- `details_submitted === true`: "Your information is under review. This usually takes a few minutes."

## Enhancements

### E1: Checkout loading overlay
After "Proceed to Checkout" is clicked, the dialog closes and a toast fires, but the page just sits there for 2-5 seconds. Add a brief full-page or card-level overlay with a spinner and "Redirecting to secure checkout…" text, dismissed when `window.location.href` navigates away.

### E2: Hardware tab quantity selector should respect org connection tier
Currently any connected org can order up to 5 readers per checkout. For multi-location orgs, this may be too low. Consider making the max configurable or raising it to 10 (the Zod schema already allows `max(10)`). The client-side Select only shows 1-5.

---

## Immediate Changes

| File | Change |
|------|--------|
| `ZuraPayHardwareTab.tsx` | Remove `onError` fallthrough to checkout (B1); include `subtab=hardware` in success URL (G3) |
| `terminal-hardware-order/index.ts` | After `hardware_orders` insert, update matching `terminal_hardware_requests` to "approved" (B2); add idempotency key to session creation (G1) |
| `connect-zura-pay/index.ts` | Make `return_url` and `refresh_url` required in Zod schema, remove hardcoded fallback paths (B3) |
| `TerminalSettingsContent.tsx` | Fix `TabErrorBoundary` reset on tab switch (B4) |

0 migrations, 0 new edge functions, 0 new dependencies.

