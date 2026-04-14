

# Fleet Tab Audit: Bugs, Gaps, and Enhancements

## Bugs

### B1: `hasOwnAccount` always receives `null` for `orgAccountId`
**Location:** Line 104 — `hasOwnAccount(loc, null)` is hardcoded to `null` instead of passing the actual `orgConnectAccountId`. This means the "own account" indicator (legal name display) never works correctly in the Fleet Overview grid, because every location with *any* Stripe account will be treated as having its own account.

**Fix:** `LocationSummaryRow` needs `orgConnectAccountId` passed as a prop so `hasOwnAccount` can correctly compare.

### B2: `useOrgBankLast4` query not invalidated after verify mutation
When the user clicks "Check Status" and the verify mutation succeeds, the `org-bank-last4` query cache isn't invalidated. If the bank account changed, the stale query value persists until the 5-minute stale time expires.

**Fix:** Add `queryClient.invalidateQueries({ queryKey: ['org-bank-last4'] })` inside `useVerifyZuraPayConnection`'s `onSuccess`.

### B3: No loading state for bank last4 on the "Use Account" button
When `useOrgBankLast4` is still fetching, the button shows "Use Organization Account" (the fallback), which flickers to the last4 text once loaded. This creates a jarring flash.

**Fix:** Disable the button or show a skeleton while `bankLast4Query.isLoading` is true.

## Gaps

### G1: No error handling for `useOrgBankLast4` failure
If the edge function call fails (network error, Stripe outage), the error is silently swallowed. The user sees "Use Organization Account" with no indication anything went wrong.

**Fix:** Surface a subtle inline error or fall back gracefully with a toast on failure.

### G2: Fleet Overview grid not responsive
The 5-column grid at line 380 will compress poorly on narrower viewports (tablet). No responsive breakpoint or horizontal scroll is defined.

**Fix:** Add `overflow-x-auto` wrapper or reduce columns on smaller breakpoints.

### G3: Missing `orgConnectAccountId` context in Fleet Overview rows
Fleet Overview rows can't distinguish "uses org account" vs "has own separate account" because the org account ID isn't passed down (related to B1). The legal name hint and potential "Own Account" badge are broken.

## Enhancements

### E1: Show payout destination context on connected locations
Once a location is connected, there's no visible indicator of *which* bank account its payouts go to (org account vs its own). Adding a subtle "Payouts → ••1234" label on connected location rows would give operators instant clarity.

### E2: Preload bank last4 in org connect status query
Instead of a separate edge function call for bank last4, the org connect status could be extended to include it from the database (cache the last4 when verify runs). This eliminates the extra network round-trip on every page load.

## Summary

| # | Type | Severity | File(s) |
|---|------|----------|---------|
| B1 | Bug | Medium | `ZuraPayFleetTab.tsx` |
| B2 | Bug | Low | `useZuraPayConnect.ts` |
| B3 | Bug | Low | `TerminalSettingsContent.tsx`, `ZuraPayFleetTab.tsx` |
| G1 | Gap | Low | `useZuraPayConnect.ts` or `TerminalSettingsContent.tsx` |
| G2 | Gap | Low | `ZuraPayFleetTab.tsx` |
| G3 | Gap | Medium | `ZuraPayFleetTab.tsx` (same root cause as B1) |
| E1 | Enhancement | Low | `ZuraPayFleetTab.tsx` |
| E2 | Enhancement | Low | Edge function + `useZuraPayConnect.ts` |

## Recommended Fix Order

1. **B1 + G3** — Pass `orgConnectAccountId` to `LocationSummaryRow` (single prop addition)
2. **B2** — Add query invalidation in verify mutation `onSuccess`
3. **B3** — Add loading guard on the "Use Account" button
4. **G1** — Add error fallback for bank last4 query
5. **G2** — Responsive wrapper on fleet grid
6. **E1, E2** — Optional polish passes

