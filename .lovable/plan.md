

# Fleet Tab Audit — Pass 4

All B1-B3, G2-G3 fixes from passes 1-3 confirmed in place. Here are remaining findings.

---

## Bugs

### B1: `hasFirstTransaction` prop coerced to `undefined` on first render
**Location:** `TerminalSettingsContent.tsx` line 424 — `hasFirstTransaction` is passed directly from `useQuery` data, which is `undefined` while loading. The checklist treats `undefined` as falsy (step incomplete), which is correct. However, the `hasFirstTransaction` prop type on `ZuraPayActivationChecklist` is `boolean` (not `boolean | undefined`), so TypeScript silently coerces. This means during loading, step 6 flickers from incomplete to complete once data arrives.

**Severity:** Very Low — cosmetic flicker only, no logic error.

**Fix:** Accept `boolean | undefined` in the prop type and show a subtle loading indicator on step 6 while `undefined`.

### B2: Checklist hides entirely when all 6 steps complete — no success confirmation
**Location:** `ZuraPayActivationChecklist.tsx` line 71 — `if (allComplete) return null;` removes the checklist instantly. The operator gets no "You're all set!" moment. After completing their first transaction, the checklist just vanishes on next render.

**Severity:** Low — UX gap, not a functional bug.

**Fix:** Instead of returning null, show a compact success state (e.g., green checkmark with "All steps complete" that can be dismissed or auto-hides after a session).

### B3: `createLocationAccountMutation` missing `organizationId` in query invalidation
**Location:** `useZuraPayConnect.ts` line 132 — `onSuccess` invalidates `['org-connect-status', vars.organizationId]` but does NOT invalidate `['org-bank-last4', vars.organizationId]`. After creating a location-level account, the org bank last4 cache remains stale.

**Severity:** Low — only relevant if the location account creation flow somehow changes the org-level bank info (unlikely but defensive invalidation is best practice).

---

## Gaps

### G1: No Payouts subtab (carried forward)
The `useZuraPayPayouts` hook exists with full balance/schedule/bank-account types but no tab renders it. The configurator doctrine lists Payouts as the 6th subtab. This is likely Phase 2 but should be tracked.

### G2: Checklist doesn't indicate which step to act on next
**Location:** `ZuraPayActivationChecklist.tsx` — All incomplete steps look identical (grey circle). The first incomplete step should be visually highlighted as the "current" step to guide the operator's attention.

**Fix:** Add a distinct style (e.g., primary-colored circle or pulse animation) to the first incomplete step.

### G3: `hasFirstTransaction` query has no `refetchOnWindowFocus`
**Location:** `TerminalSettingsContent.tsx` line 337 — After processing a first transaction on the scheduler page and returning to settings, the query won't refetch until the 60s stale time expires. The checklist step stays incomplete even though the transaction succeeded.

**Fix:** Add `refetchOnWindowFocus: true` (or reduce staleTime) so returning to the settings page picks up the new transaction.

---

## Enhancements

### E1: Collapse "Connect Separate Account" behind disclosure (carried forward)
The payout destination selection shows both options at equal weight. Collapsing the second behind a "Need a different bank account?" text link would reduce visual noise for the common case.

### E2: Show payout destination on connected Fleet Overview rows (carried forward)
Connected rows show status but not which account receives payouts. A subtle "Org Account" or "Own ••1234" label would provide instant clarity.

---

## Summary

| # | Type | Severity | File(s) |
|---|------|----------|---------|
| B1 | Bug | Very Low | `TerminalSettingsContent.tsx`, `ZuraPayActivationChecklist.tsx` |
| B2 | Bug | Low | `ZuraPayActivationChecklist.tsx` |
| B3 | Bug | Low | `useZuraPayConnect.ts` |
| G1 | Gap | Info | `TerminalSettingsContent.tsx` |
| G2 | Gap | Low | `ZuraPayActivationChecklist.tsx` |
| G3 | Gap | Medium | `TerminalSettingsContent.tsx` |
| E1 | Enhancement | Low | `ZuraPayFleetTab.tsx` |
| E2 | Enhancement | Low | `ZuraPayFleetTab.tsx` |

## Recommended Fix Order

1. **G3** — Add `refetchOnWindowFocus: true` to `hasFirstTransaction` query (one line, immediate UX impact)
2. **G2** — Highlight the "current" step in the activation checklist
3. **B2** — Show a success state instead of hiding the checklist when all steps complete
4. **B3** — Add `org-bank-last4` invalidation to `createLocationAccountMutation`
5. **B1, G1, E1, E2** — Lower priority polish

