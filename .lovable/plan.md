

# Zura Pay — Fifth-Pass Audit

## Critical Bug

### B1: Hardware checkout opens in a new tab — success redirect never reaches the original tab
**Severity: Critical — checkout verification is broken.**

`useCreateTerminalCheckout` (line 80 of `useTerminalHardwareOrder.ts`) calls `window.open(data.url, '_blank')` on success. This opens Stripe Checkout in a **new tab**. When the user completes payment, the `success_url` redirect (`?tab=terminals&checkout=success&session_id=...`) loads in that **new tab** — which is a fresh page load of the settings page. Meanwhile, the **original tab** still has the purchase dialog open with no indication that checkout completed.

The lifted `useEffect` in `TerminalSettingsContent` only fires on mount with matching search params. The original tab never gets these params. The new tab loads the full app, but the `hasVerifiedReturn` ref starts as `false` — so it **does** fire the verify in the new tab. However, the UX is confusing: the user has two tabs open, the dialog is still showing in the original, and verification happens in the wrong tab.

**Fix:** Change `window.open(data.url, '_blank')` to `window.location.href = data.url` so checkout happens in the same tab. This matches the Connect onboarding flow (which already uses `window.location.href`). Close the dialog before redirecting.

**File:** `src/hooks/useTerminalHardwareOrder.ts` (line 80)

### B2: Purchase dialog stays open after checkout redirect initiated
Even with the B1 fix, the dialog should close before navigation. Currently `handlePurchase` fires the mutation but never calls `handleDialogClose()`.

**Fix:** Call `handleDialogClose()` in the `onSuccess` of `createCheckout.mutate` (before redirect), or better — close it before mutating since the redirect will navigate away.

**File:** `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx` (inside `handlePurchase`)

## Bugs

### B3: Stripe SDK version mismatch across edge functions
`connect-zura-pay` and `verify-zura-pay-connection` use `stripe@17.7.0` with API version `2024-12-18.acacia`. `terminal-hardware-order` uses `stripe@18.5.0` with `2025-04-30.basil`. Mixed SDK versions risk type/behavior inconsistencies and complicate maintenance.

**Fix:** Align all three to `stripe@18.5.0` and `2025-04-30.basil`.

**Files:** `supabase/functions/connect-zura-pay/index.ts`, `supabase/functions/verify-zura-pay-connection/index.ts`

### B4: `activeLocationId` can be empty string passed to hooks
`TerminalSettingsContent` line 271: `activeLocationId` falls through to `locations?.[0]?.id || null`. But `RegisterReaderDialog` receives `locationId={activeLocationId || ''}` (line 404). If `activeLocationId` is null, an empty string is passed to `invokeTerminalAction`, which sends `location_id: ""` to the edge function — causing a failed lookup.

**Fix:** Disable the Register Reader dialog button when `activeLocationId` is null (it's already indirectly gated, but the prop should also guard).

### B5: `createRequest` sends `locations[0]?.id || ''` as fallback locationId
`ZuraPayHardwareTab.tsx` line 109: `locationId: reqLocationId || locations[0]?.id || ''`. If no location is selected and `locations` is empty (shouldn't happen given the gate in parent), an empty string is sent. Even with locations available, the user might intend no location — but the field is labeled "optional" while the mutation requires it.

**Fix:** Minor — validate that `reqLocationId` or a default exists before enabling the purchase button.

## Gaps

### G1: No `hardware_orders` INSERT policy for org users — relies entirely on service_role
The edge function inserts into `hardware_orders` using service_role, bypassing RLS. This works, but means there's no defense-in-depth. If the function ever changes to use the user's JWT, inserts would silently fail.

**Status:** Acceptable — document the dependency on service_role.

### G2: `details_submitted` not surfaced in Fleet tab pending state (E2 from previous pass)
The `verify-zura-pay-connection` edge function returns `details_submitted` in its response. The Fleet tab pending copy (line 324) uses generic text. Differentiating "You haven't completed the onboarding form yet" from "Your information is under review" would improve abandoned-onboarding UX.

**Fix:** Store `details_submitted` from the verify response and conditionally render different copy in the pending state.

### G3: No error boundary around Connectivity and Display tabs
If `ZuraPayConnectivityTab` or `ZuraPayDisplayTab` throw during render, the entire settings page crashes. These tabs contain complex visualization (S710 simulator) that could fail on edge cases.

**Fix:** Wrap each `TabsContent` child in an error boundary, or add a shared `TabErrorBoundary` wrapper.

## Enhancements

### E1: Show a "Redirecting to checkout…" state after purchase button click
After clicking "Proceed to Checkout," the mutation fires but the user sees only a spinner on the button. If redirect takes 2-3 seconds, add a brief overlay or toast: "Redirecting to secure checkout…"

### E2: Persist `activeTab` in URL search params
Currently `activeTab` defaults to `fleet` on every mount. If a user bookmarks or shares a link to the Hardware tab, it resets. Syncing `activeTab` with a `subtab` URL param would preserve tab state across navigation.

---

## Immediate Changes

| File | Change |
|------|--------|
| `src/hooks/useTerminalHardwareOrder.ts` | Change `window.open(url, '_blank')` to `window.location.href = url` (B1) |
| `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx` | Close dialog before checkout redirect (B2); validate location selection (B5) |
| `supabase/functions/connect-zura-pay/index.ts` | Upgrade to `stripe@18.5.0` and API version `2025-04-30.basil` (B3) |
| `supabase/functions/verify-zura-pay-connection/index.ts` | Same Stripe upgrade (B3) |

0 migrations, 0 new edge functions, 0 new dependencies.

