

# Zura Pay Configurator — Second-Pass Audit

## Bugs

### B1: Brand leakage — "powered by Stripe" in Connect setup copy
**File:** `ZuraPayFleetTab.tsx:290`
The "Not Connected" state says *"You'll be guided through a secure verification process powered by Stripe."* This leaks the processor name to org users. Per brand standards, all Stripe references must be removed from org-facing surfaces.
**Fix:** Change to *"You'll be guided through a secure verification process to enable payments."*

### B2: Brand leakage — code comment says "Stripe Connect" in org-facing component
**File:** `ZuraPayFleetTab.tsx:129, 282`
Comments say `// Stripe Connect self-serve props` and `// Org-level: no Stripe Connect account at all`. While not user-visible, these violate the brand abstraction layer doctrine and risk leaking into error messages or debugging output if copy-pasted.
**Fix:** Replace with `// Payment connect self-serve props` and `// Org-level: no payment account connected`.

### B3: Brand leakage — "Stripe" in verify pending toast
**File:** `useZuraPayConnect.ts:98`
The pending toast says *"Stripe may need additional information."* Org users should not see this.
**Fix:** Change to *"Additional information may be required to complete verification."*

### B4: `handlePurchase` fires checkout even when `createRequest` fails
**File:** `ZuraPayHardwareTab.tsx:134-135`
The `onError` callback for `createRequest.mutate` still fires `createCheckout.mutate`. This means if the request logging fails (e.g., RLS denial, network error), the checkout proceeds anyway. If request tracking is advisory, this is acceptable — but the user gets no feedback that the request record was lost.
**Fix:** Add a `console.warn` in the `onError` path noting the request record failed, so the checkout still proceeds but the gap is logged. Alternatively, if request tracking is mandatory, block checkout on failure.

### B5: `useEffect` in HardwareTab cleans URL params but doesn't guard against double-fire
**File:** `ZuraPayHardwareTab.tsx:58-68`
The checkout return handler reads `searchParams` and fires `verifyRef.current`, then cleans params. But since `searchParams` is in the dependency array, the state update from `setSearchParamsRef` can cause a re-render with the old params still in flight (React batching). The `verifyRef` pattern prevents stale closures, but there's no guard preventing the effect from running twice if the component remounts before params are cleaned.
**Fix:** Add a `useRef` flag (`hasVerified`) that gates the verify call, similar to the pattern in `useAutoJoinLocationChannels`.

### B6: `connect_location` update doesn't use `count` option
**File:** `connect-zura-pay/index.ts:127`
The Supabase JS client doesn't return `count` by default — you need `.update(..., { count: 'exact' })` for the `count` property to be populated. Without this option, `count` is always `null`, and the `if (count === 0)` check on line 142 never triggers.
**Fix:** Add `{ count: 'exact' }` as the second argument to the `.update()` call.

## Gaps

### G1: No input validation (Zod) on edge function request bodies
Both `connect-zura-pay` and `verify-zura-pay-connection` parse `req.json()` without schema validation. Malformed payloads could cause unhandled exceptions rather than clean 400 responses. Per edge function guidelines, Zod validation is required.
**Fix:** Add Zod schemas for both edge functions' request bodies.

### G2: `is_org_admin` RPC may not exist
**File:** `connect-zura-pay/index.ts:49`
The edge function calls `supabase.rpc("is_org_admin", ...)`. If this RPC function doesn't exist in the database, every connect attempt will fail silently (the `.data` will be falsy, returning 403). Similarly, `verify-zura-pay-connection` calls `is_org_member`. Need to verify these RPCs exist.
**Fix:** Verify `is_org_admin` and `is_org_member` RPCs exist in the database. If not, create them or use an alternative authorization check.

### G3: No disconnect/revoke flow for connected locations
There's no way to disconnect a location from Zura Pay once connected. If a location closes or an org wants to reassign, they're stuck. This was flagged in the previous audit as E2 but not implemented.
**Status:** Phase 2 — document for future implementation.

### G4: Fleet overview table lacks a click-to-select interaction
The "All Locations" fleet overview table shows location rows but they're not clickable. Users must use the dropdown to switch to a specific location. Clicking a row should select that location.
**Fix:** Add `onClick` to `LocationSummaryRow` that calls `setShowAllLocations(false)` and `setSelectedLocationId(loc.id)`.

### G5: Hardware tab SKU query fires even when org is not connected
**File:** `ZuraPayHardwareTab.tsx:40`
`useTerminalHardwareSkus()` runs unconditionally. When `isOrgConnected` is false, the component renders the "setup required" gate, but the SKU fetch still fires. Wastes an edge function call.
**Fix:** Pass `enabled: isOrgConnected` or conditionally call the hook after the gate check using early return pattern (already done on line 140, but the hook runs before the return).

## Enhancements

### E1: Add a "Refresh Status" button to the Fleet Overview for multi-location orgs
In "All Locations" view, there's no way to refresh the connection status for all locations at once. A single button to re-fetch `zura-pay-locations` query would be useful.

### E2: Show onboarding completion percentage in pending state
When `orgConnectStatus === 'pending'`, the UI shows a generic "Verification in progress" message. If the Stripe account has `details_submitted === false`, the user likely abandoned onboarding midway. The "Continue Onboarding" button is there, but the copy should differentiate between "you didn't finish" vs "we're reviewing your info."
**Fix:** Pass `details_submitted` from the verify response and show different copy: "You haven't completed the onboarding form yet" vs "Your information is under review."

### E3: Hardware tab should show which location a reader will be assigned to
The order dialog asks for a location but doesn't explain that the reader will be shipped — it's not assigned to a terminal location until registered. The UX could clarify this distinction.

---

## Immediate Changes

| File | Change |
|------|--------|
| `ZuraPayFleetTab.tsx` | Remove "powered by Stripe" from line 290 (B1); clean up Stripe comments (B2); add click-to-select on fleet rows (G4) |
| `useZuraPayConnect.ts` | Remove "Stripe" from pending toast (B3) |
| `ZuraPayHardwareTab.tsx` | Add double-fire guard to checkout return handler (B5) |
| `connect-zura-pay/index.ts` | Add `{ count: 'exact' }` to update call (B6); add Zod input validation (G1) |
| `verify-zura-pay-connection/index.ts` | Add Zod input validation (G1) |

0 migrations, 0 new edge functions, 0 new dependencies. Zod is available in Deno runtime.

