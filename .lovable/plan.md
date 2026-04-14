

# Fleet Tab Audit — Pass 2

After reviewing the current state of all files post-fix, here are the remaining findings.

---

## Bugs

### B1: Activation checklist doesn't receive `locationHasOwnAccount`
**Location:** `TerminalSettingsContent.tsx` line 405 — `ZuraPayActivationChecklist` accepts a `locationHasOwnAccount` prop but it's never passed. The checklist always evaluates as if no location has its own account, so steps 1–2 ("Create Account" / "Complete Verification") won't auto-complete for locations with separate accounts.

**Fix:** Pass `locationHasOwnAccount={hasOwnAccount(activeLocation, connectStatus?.stripe_connect_account_id)}` from `TerminalSettingsContent`. Import the `hasOwnAccount` helper or inline the check.

### B2: `hasFirstTransaction` query scoped to org, not location
**Location:** `TerminalSettingsContent.tsx` line 328 — The query checks if the org has *any* terminal payment, but the checklist renders per-location. When viewing the "All Locations" overview, the checklist shows against a null location, which is misleading. Also, a single-location org that processed a payment at location A would incorrectly show step 6 complete when viewing location B.

**Severity:** Low — minor UX inaccuracy. Could scope the query by `activeLocationId` when not in "all" mode, or accept the org-level scope as intentional.

### B3: `orgBankLast4Error` prop accepted but never surfaced
**Location:** `ZuraPayFleetTab.tsx` — The component accepts `orgBankLast4Error` (line 165) but never renders an error state. If the bank last4 fetch fails, the button silently falls back to "Use Organization Account" with no indication of a problem.

**Fix:** When `orgBankLast4Error` is true, show a small inline warning beneath the button (e.g., "Unable to load account details") using `text-destructive` styling.

---

## Gaps

### G1: No Payouts tab in terminal tabs
**Location:** `TerminalSettingsContent.tsx` line 415 — The Tabs list includes Fleet, Hardware, Connectivity, Display, Tipping, Receipts — but Payouts is mentioned in the configurator doctrine as the 6th subtab. The `useZuraPayPayouts` hook exists but has no corresponding tab component.

**Fix:** This may be intentional for the current phase. Flag for awareness.

### G2: Keyboard accessibility on Fleet Overview rows incomplete
**Location:** `ZuraPayFleetTab.tsx` line 101 — The `onKeyDown` handler only checks Enter/Space but doesn't call `e.preventDefault()` for Space, which will scroll the page. Also missing `aria-label`.

**Fix:** Add `e.preventDefault()` in the Space branch; add `aria-label={`Select ${loc.name}`}`.

### G3: Location picker doesn't auto-select after return from onboarding
**Location:** `TerminalSettingsContent.tsx` line 283 — After returning from Stripe onboarding, `verifyMutation` fires and may auto-connect a location, but `selectedLocationId` stays null. The user sees "All Locations" and must manually select the connected location to see their terminal setup.

**Fix:** In the verify `onSuccess`, if `auto_connected_location_id` is returned, call `setSelectedLocationId(data.auto_connected_location_id)` and `setShowAllLocations(false)`.

---

## Enhancements

### E1: Collapse "Connect Separate Account" behind a disclosure
The payout destination selection shows both options immediately, which adds visual weight. Collapsing "Connect Separate Account" behind a "Need a different bank account?" link would reduce cognitive load for the common case (org account).

### E2: Show payout destination indicator on connected location rows
Fleet Overview rows show connection status but not *which* account they're using. A subtle "••1234" or "Own Account" label on connected rows would give instant clarity without clicking in.

---

## Summary

| # | Type | Severity | File(s) |
|---|------|----------|---------|
| B1 | Bug | Medium | `TerminalSettingsContent.tsx` |
| B2 | Bug | Low | `TerminalSettingsContent.tsx` |
| B3 | Bug | Low | `ZuraPayFleetTab.tsx` |
| G1 | Gap | Info | `TerminalSettingsContent.tsx` |
| G2 | Gap | Low | `ZuraPayFleetTab.tsx` |
| G3 | Gap | Medium | `TerminalSettingsContent.tsx` |
| E1 | Enhancement | Low | `ZuraPayFleetTab.tsx` |
| E2 | Enhancement | Low | `ZuraPayFleetTab.tsx` |

## Recommended Fix Order

1. **B1** — Pass `locationHasOwnAccount` to checklist (one prop)
2. **G3** — Auto-select location after onboarding return
3. **B3** — Surface `orgBankLast4Error` inline
4. **G2** — Keyboard accessibility fix (prevent default + aria-label)
5. **B2, G1, E1, E2** — Lower priority polish

