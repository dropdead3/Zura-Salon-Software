

# Zura Pay Configurator — Gaps, Bugs & Enhancements

## Bugs

### B1: `useEffect` dependency list incomplete (TerminalSettingsContent.tsx:239)
The return-from-Stripe handler only lists `[orgId]` as a dependency but references `searchParams`, `setSearchParams`, and `verifyMutation`. On first render, `searchParams` is captured stale. If the component mounts before `orgId` resolves, the params could be cleaned up but the verify call skipped.

**Fix:** Use a ref for `verifyMutation.mutate` (like HardwareTab already does) and add `searchParams` to the dependency array with an early-return guard for `orgId`. Alternatively, extract this into a custom hook.

### B2: Stripe brand leakage in pending state copy (ZuraPayFleetTab.tsx:301)
The pending state says *"Your account is being verified by Stripe."* — this leaks the processor name to org users. Should say *"Your account is being verified"* or *"Verification is in progress."*

**Fix:** Remove "by Stripe" from line 301.

### B3: `selectedLocationId` not used in `ZuraPayFleetTab` prop list
The prop `selectedLocationId` is declared in `ZuraPayFleetTabProps` (line 114) and passed from the parent, but never referenced inside the component body. Dead prop.

**Fix:** Remove from interface and call site.

### B4: Connect mutation fires redirect but doesn't gate on `onboarding_url` presence robustly
In `useZuraPayConnect.ts:67`, `window.location.href = data.onboarding_url` fires inside `onSuccess`. If Stripe returns a response without `onboarding_url` (e.g. the account already completed onboarding), this silently navigates to `undefined`.

**Fix:** Guard with `if (data.onboarding_url)` is already present but the else path does nothing — add a toast or status update for the fallback case.

### B5: Single-location orgs see no location picker and default to first location — but Fleet tab doesn't show which location
When `locations.length === 1`, the location picker is hidden (`locations.length > 1` guard on line 175). The user sees fleet content with no indication of which location is selected.

**Fix:** Show the location name as a static label when there's only one location.

## Gaps

### G1: No error feedback on `connect_location` edge function failure
The `connect-zura-pay` edge function `connect_location` action doesn't validate that the location actually belongs to the org beyond the `organization_id` match in the UPDATE. This is fine because the WHERE clause handles it, but there's no row-count check — if 0 rows updated (location doesn't exist), it still returns `{ success: true }`.

**Fix:** Check the update result count and return 404 if no rows matched.

### G2: No webhook for Stripe Connect account status changes
The current flow relies on the user manually clicking "Check Status" or returning from onboarding. If Stripe verifies the account later (common for manual review), the org status stays stuck on "pending" until someone clicks verify.

**Fix (enhancement):** Add an `account.updated` webhook handler that automatically updates `stripe_connect_status` when Stripe completes verification. This is a Phase 2 item — document it for now.

### G3: No RLS policy restricting who can UPDATE `stripe_connect_*` columns on organizations
The migration adds columns but relies on existing org RLS policies. The edge function uses service-role (bypasses RLS), which is correct. However, if any org admin accidentally calls the organizations table directly from the client, they could theoretically write to `stripe_connect_account_id`. This is low-risk since the column is text and the edge function is the intended write path.

**Status:** Acceptable — flag for security audit.

### G4: Hardware tab doesn't gate on payment connection status
An org user can access the Hardware tab and attempt to order terminals even if no location is connected to Zura Pay. The checkout flow would fail at the edge function level, but the UI doesn't prevent this.

**Fix:** Show a prompt in Hardware tab if `orgConnectStatus !== 'active'` directing users to complete setup in Fleet first.

### G5: Display tab shows simulator regardless of connection status
Same issue — the checkout simulator is visible even when no payment processing is set up.

**Status:** Acceptable — it's a preview/marketing surface. No fix needed.

## Enhancements

### E1: Toast feedback after successful location connection
After enabling Zura Pay for a location, the toast fires but the UI doesn't auto-navigate to show the newly connected location's fleet content. The user stays on the same empty state until they manually re-select.

**Fix:** After `connectLocationMutation` succeeds, invalidate queries (already done) and ensure the UI re-renders to show the connected state. May need to force a re-fetch of `connectStatus`.

### E2: Add a "Disconnect Location" action for connected locations
There's no way for an org admin to disconnect a location from Zura Pay. This would be useful for location closures or reorganizations.

**Fix (future):** Add a `disconnect_location` action to the edge function and a UI trigger in the fleet overview.

---

## Changes (Immediate Fixes)

| File | Change |
|------|--------|
| `src/components/dashboard/settings/terminal/ZuraPayFleetTab.tsx` | Remove "by Stripe" from pending copy (B2); remove dead `selectedLocationId` prop (B3); show location name for single-location orgs (B5) |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Fix `useEffect` deps for return handler (B1); remove `selectedLocationId` from Fleet tab props (B3) |
| `src/hooks/useZuraPayConnect.ts` | Add toast for missing `onboarding_url` fallback (B4) |
| `supabase/functions/connect-zura-pay/index.ts` | Add row-count validation on `connect_location` (G1) |
| `src/components/dashboard/settings/terminal/ZuraPayHardwareTab.tsx` | Gate hardware ordering on org connect status (G4) |

0 migrations, 0 new edge functions, 0 new dependencies.

