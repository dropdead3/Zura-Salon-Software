

# Zura Capital — Third Audit Pass

## Summary

Previous passes fixed access control, status alignment, webhook security, stylist exposure check, and policy overrides. This pass found **4 remaining bugs**, **3 gaps**, and **1 data integrity issue**.

---

## BUGS

### B1. `CapitalOpportunityDetail` Page — No Owner Gating on Fund Button
**Severity: High (Security)**

`src/pages/dashboard/admin/CapitalOpportunityDetail.tsx` renders the "Fund This" button (line 196) without any `isPrimaryOwner` check. It also uses `getProvider('stripe').initiateFunding()` which silently swallows errors instead of showing a toast. The server-side `is_primary_owner` check will reject the request, but the user gets no clear feedback — the provider abstraction returns `{ error: "..." }` and the code only checks `result.redirectUrl` (line 149), silently dropping the error.

**Fix:** Import `useIsPrimaryOwner`, gate the button (same pattern as `CapitalFundingConfirmModal`), and show error feedback.

### B2. `FundingOpportunityDetail` — Same Dual-Path + Silent Error Issue
**Severity: Medium**

`src/components/dashboard/capital-engine/FundingOpportunityDetail.tsx` line 101 uses `getProvider('stripe').initiateFunding(opportunity.id, '', '')` — passing empty strings for `organizationId` and `returnUrl`. The edge function will fail with "Missing opportunityId or organizationId" but the error is caught silently (line 107: `console.error` only, no toast).

The `isPrimaryOwner` gating was added visually (the button shows a lock icon for non-owners) but the `handleFund` function itself doesn't short-circuit — if someone bypasses the disabled state, the call proceeds (fails server-side, but silently).

**Fix:** Replace `getProvider` with `useInitiateFinancing` (same as `CapitalFundingConfirmModal`), which passes `organizationId` correctly and shows error toasts. Add early return in `handleFund` if not primary owner.

### B3. `CapitalOpportunityDetail` Page — `getProvider` Passes Empty orgId
**Severity: Medium**

Line 148: `provider.initiateFunding(o.id, '', '')` passes empty string for `organizationId`. The edge function receives `organizationId: ''` and will fail at the `is_org_admin` RPC call, but error handling only reaches `console.error` in the `finally` block — no user feedback.

**Fix:** Same consolidation — replace with `useInitiateFinancing` which sources orgId from context.

### B4. `useOrgCapitalDiagnostics` — Location/Stylist Exposure Always Zero
**Severity: Low**

Lines 119-121 hardcode `locationExposure: 0` and `stylistExposure: 0`. While the diagnostics query active projects (line 80), it doesn't compute per-location or per-stylist exposure from funded amounts. This means checks #16 and #17 always pass in diagnostics, potentially telling admins an opportunity is eligible when production (`useZuraCapital`) would flag it for exposure limits.

**Fix:** Compute exposure from active projects (same logic as `useZuraCapital` lines 172-194) using the `capital_funding_opportunities` join for location/stylist IDs.

---

## GAPS

### G1. `CapitalOpportunityDetail` Page — No `isPrimaryOwner` Import at All
This is a full page route (`/admin/capital/:opportunityId`) that renders funding CTAs without any ownership check. Unlike the modal components which were fixed in the last pass, this page was missed entirely.

### G2. Three Funding Initiation Paths — Should Be One
Funding can be triggered from:
1. `CapitalFundingConfirmModal` — uses `useInitiateFinancing` (correct)
2. `FundingOpportunityDetail` — uses `getProvider('stripe')` (broken orgId)
3. `CapitalOpportunityDetail` — uses `getProvider('stripe')` (broken orgId)

All three should use `useInitiateFinancing` for consistent error handling, correct orgId, and the `is_primary_owner` server-side check.

### G3. Legacy `useFinancedProjects` Hook Still Exported and Consumed
`useFinancedProjects` (querying legacy `financed_projects` table) is still imported by `CapitalFundingConfirmModal` for `useInitiateFinancing`. While `useInitiateFinancing` itself is correct (it calls the edge function), the hook file also exports `useFinancedProjects` and `useFinancedProjectLedger` which query legacy tables. Any component using those gets stale data. These should be deprecated or removed.

---

## Recommended Fix Priority

```text
Priority 1 (Security):
  B1  CapitalOpportunityDetail — add owner gating
  G2  Consolidate all funding paths to useInitiateFinancing

Priority 2 (Correctness):
  B2  FundingOpportunityDetail — fix silent errors + empty orgId
  B3  CapitalOpportunityDetail — fix empty orgId
  B4  Diagnostics — compute real exposure values

Priority 3 (Cleanup):
  G3  Deprecate legacy useFinancedProjects/useFinancedProjectLedger
```

## File Summary

| File | Change |
|---|---|
| `src/pages/dashboard/admin/CapitalOpportunityDetail.tsx` | Add `useIsPrimaryOwner` gating on fund button; replace `getProvider` with `useInitiateFinancing`; add error toast |
| `src/components/dashboard/capital-engine/FundingOpportunityDetail.tsx` | Replace `getProvider` with `useInitiateFinancing`; add early return for non-owner; add error toast |
| `src/hooks/useOrgCapitalDiagnostics.ts` | Compute per-location and per-stylist exposure from active project data |
| `src/hooks/useFinancedProjects.ts` | Add deprecation comments to legacy hooks; keep `useInitiateFinancing` |

