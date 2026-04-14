

# Fleet Tab Audit — Pass 3

All previous B1-B3, G2-G3 fixes confirmed in place. Here are remaining findings.

---

## Bugs

### B1: `hasFirstTransaction` still scoped to org, not location
**Location:** `TerminalSettingsContent.tsx` line 337 — The query checks if the org has *any* terminal payment, but the checklist renders per-location. A payment at location A shows step 6 complete when viewing location B.

**Fix:** When `activeLocationId` is set, add a `.eq('location_id', activeLocationId)` filter to scope the query. Keep org-level scope only when in "All Locations" mode. Update query key to include `activeLocationId`.

### B2: `useOrgBankLast4` calls `verify-zura-pay-connection` — expensive for a read
**Location:** `useZuraPayConnect.ts` line 46 — The bank last4 query invokes the full verify edge function (which likely writes/updates status) just to read `bank_last4`. This means every page load triggers a verify side-effect.

**Severity:** Low-Medium — if the verify function is idempotent this is just wasteful; if it has side-effects (status updates, webhooks) it could cause unexpected state changes.

**Fix:** Either create a lightweight read-only endpoint, or confirm the verify function is safe for repeated calls and document the intention.

### B3: Single-location org skips location picker but never sets `selectedLocationId`
**Location:** `TerminalSettingsContent.tsx` line 326 — For a single-location org, `selectedLocationId` stays `null` and falls through to `locations?.[0]?.id`. This works for rendering but means `activeLocationId` differs from what's in state. If any callback relies on `selectedLocationId` directly (rather than `activeLocationId`), it would get `null`.

**Severity:** Low — currently safe because all callbacks use `activeLocationId`, but fragile.

---

## Gaps

### G1: No Payouts subtab
**Location:** `TerminalSettingsContent.tsx` line 430-435 — The `useZuraPayPayouts` hook exists but there's no Payouts tab. The configurator doctrine lists it as the 6th subtab. Flagged for awareness (may be Phase 2).

### G2: `locations` query doesn't fetch `legal_name`
**Location:** `TerminalSettingsContent.tsx` line 77 — The query selects `address, city, state_province` but not `legal_name`. However, `LocationSummaryRow` (ZuraPayFleetTab line 107) tries to render `loc.legal_name`. This field will always be `undefined`, so the "own account" legal name hint never displays.

**Fix:** Add `legal_name` to the select clause on line 77.

### G3: Fleet Overview loading skeleton doesn't use `min-w-[500px]`
**Location:** `ZuraPayFleetTab.tsx` line 76 — The loading skeleton row uses `grid-cols-5` but doesn't have the `min-w-[500px]` class that the header row has, so on narrow viewports the skeleton could wrap while the header doesn't.

**Severity:** Very low — cosmetic only.

---

## Enhancements

### E1: Show payout destination on connected Fleet Overview rows
Connected rows show status but not *which* bank account receives payouts. A subtle "••1234" or "Org Account" label would give instant clarity. Would require passing `orgBankLast4` into `LocationSummaryRow` or fetching per-location bank info.

### E2: Collapse "Connect Separate Account" behind disclosure
The payout destination selection shows both options immediately. Collapsing the second option behind "Need a different bank account?" would reduce visual weight for the common case.

---

## Summary

| # | Type | Severity | File(s) |
|---|------|----------|---------|
| B1 | Bug | Low | `TerminalSettingsContent.tsx` |
| B2 | Bug | Low | `useZuraPayConnect.ts` |
| B3 | Bug | Low | `TerminalSettingsContent.tsx` |
| G1 | Gap | Info | `TerminalSettingsContent.tsx` |
| G2 | Gap | Medium | `TerminalSettingsContent.tsx` |
| G3 | Gap | Very Low | `ZuraPayFleetTab.tsx` |
| E1 | Enhancement | Low | `ZuraPayFleetTab.tsx` |
| E2 | Enhancement | Low | `ZuraPayFleetTab.tsx` |

## Recommended Fix Order

1. **G2** — Add `legal_name` to locations query select (one field, immediate impact on "own account" display)
2. **B1** — Scope `hasFirstTransaction` by `activeLocationId`
3. **B2** — Document or refactor `useOrgBankLast4` to avoid verify side-effects
4. **G3** — Add `min-w-[500px]` to skeleton rows
5. **B3, G1, E1, E2** — Lower priority polish

