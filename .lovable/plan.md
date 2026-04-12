

# Zura Capital — Second Audit Pass (Gaps & Bugs)

## Status of Previous Findings

Several bugs from the first audit were fixed (access control gating, `is_primary_owner` enforcement). The following remain open, plus new findings from this pass.

---

## STILL OPEN FROM FIRST AUDIT

### B1. Missing Eligibility Check #17 — Stylist Exposure (Bug)
`capital-formulas.ts` jumps from check #16 (location exposure, line 364) to #18 (decline cooldown, line 370). Check #17 for `stylist_exposure_exceeded` is absent. The reason code and explanation template exist in config but are never evaluated. Stylist-level concentration is unchecked.

**File:** `src/lib/capital-engine/capital-formulas.ts` line 368 (empty gap)

### B2. Sidebar & Diagnostics Status Mismatch (Bug — Critical)
Three files still filter for `['pending_review', 'approved', 'ready']` — statuses that do not exist in the state machine (`zura-capital-config.ts`). The valid statuses are `detected, eligible_internal, eligible_provider, surfaced, viewed, initiated, pending_provider, funded`, etc. This means:
- The sidebar will **never** show Capital for any org
- The Control Tower diagnostics will always report 0 qualifying opportunities
- The "Surfacing" summary card will always be 0

**Files:**
- `src/components/dashboard/SidebarNavContent.tsx` line 148
- `src/hooks/useOrgCapitalDiagnostics.ts` line 11
- `src/pages/dashboard/platform/CapitalControlTower.tsx` line 67

### B5. Premature Project Status (Bug)
`create-financing-checkout` sets `status: "active"` (line 262) before Stripe payment completes. The webhook also sets it to `"active"`. If payment fails, a ghost "active" project remains.

**File:** `supabase/functions/create-financing-checkout/index.ts` line 262

### G1. Server-Side Hardcoded Thresholds (Gap)
`create-financing-checkout` uses hardcoded `THRESHOLDS` (lines 12-21) and never reads `capital_policy_settings` for org overrides. Client-side uses `useCapitalPolicySettings` correctly, but the server rejects/accepts based on defaults only.

### G5. Webhook Accepts Unverified Payloads (Security Gap)
`financing-webhook` line 32-34: when `STRIPE_FINANCING_WEBHOOK_SECRET` is not set, it parses raw JSON without any verification. Anyone can POST fake `checkout.session.completed` events to mark projects as funded.

### G9. No Success Feedback After Funding
The checkout `success_url` redirects to `/dashboard/capital?funded=true` but no component reads the `?funded=true` query param. Users see no confirmation.

### G11. Diagnostics Use Default Policy Only
`useOrgCapitalDiagnostics` always uses `DEFAULT_CAPITAL_POLICY` (line 9), not the org's actual policy from `capital_policy_settings`. Diagnostic results may contradict what `useZuraCapital` computes (which does use org policy).

---

## NEW FINDINGS

### N1. `useZuraCapital` Passes `stylistId: null` Always (Bug)
Line 253 in `useZuraCapital.ts` hardcodes `stylistId: null` and `stylistExposure: 0` for every opportunity, even when the opportunity has a `stylist_id`. Combined with B1, stylist-level exposure is doubly broken — neither the input nor the check exists.

### N2. Opportunity Status Transition Violation in Checkout (Bug)
`create-financing-checkout` sets opportunity status to `initiated` (line 270) regardless of its current status. The state machine only allows `initiated` from `viewed` or `surfaced`. If the opportunity is in `detected` or `eligible_internal`, this is an invalid transition that skips required states.

### N3. Legacy Dual-Write Creates Orphaned Records (Gap)
The checkout function creates records in both `financed_projects` (legacy, lines 276+) and `capital_funding_projects` (production, lines 250+) depending on the path. The `useFinancedProjects` hook only queries the legacy table. The `useCapitalProjects` hook only queries the production table. No UI shows a unified view. If an admin checks one view, they miss data from the other.

### N4. `useOrgCapitalDiagnostics` Hardcodes Cross-Org Context (Gap)
Lines 77-79 hardcode `activeCapitalProjectsCount: 0`, `activeUnderperformingProjectsCount: 0`, and `repaymentDistressFlag: false`. The diagnostic panel tells admins an opportunity is eligible when it might actually fail checks 6, 7, or 8 in production (which `useZuraCapital` populates correctly from real data).

### N5. `CapitalFeatureGate` Does Not Check Role (Gap)
`CapitalFeatureGate.tsx` only checks the `capital_enabled` flag. If someone bookmarks a Capital URL and the route `requireSuperAdmin` check passes (because they're a super admin), they bypass the feature gate when the flag is on — which is correct. But the gate itself provides no role check, meaning it could be reused elsewhere without protection. Minor, but worth noting for defense-in-depth.

### N6. Control Tower `useOrganizationsWithCapital` No Pagination (Gap)
The Control Tower fetches all organizations in one query. With many orgs, this will hit the Supabase 1000-row default limit, silently truncating results.

---

## Recommended Fix Priority

```text
Priority 1 (Blocking / Security):
  B2   Status mismatch — Capital never surfaces
  G5   Webhook signature enforcement
  B5   Premature project status → "pending_payment"

Priority 2 (Correctness):
  B1   Missing stylist exposure check
  N1   stylistId always null
  N2   Invalid state transition in checkout
  G1   Server-side policy overrides
  G11  Diagnostics using wrong policy

Priority 3 (Data Integrity):
  N3   Legacy dual-write cleanup
  N4   Diagnostics hardcoded context
  G9   Success feedback after funding

Priority 4 (Robustness):
  N6   Pagination for Control Tower
```

## Technical Detail

### B2 Fix — Correct Qualifying Statuses
Replace `['pending_review', 'approved', 'ready']` with statuses from the actual state machine that represent "user-actionable" opportunities. Based on the lifecycle, the qualifying statuses should be:
```typescript
const QUALIFYING_STATUSES = ['eligible_internal', 'eligible_provider', 'surfaced', 'viewed'] as const;
```
These are the statuses where an opportunity has passed detection, is eligible, and is available for the owner to act on. Must be updated in all three files simultaneously.

### B5 Fix — Initial Status
Change `status: "active"` to `status: "pending_payment"` in `create-financing-checkout`. The webhook already handles the promotion to `"active"` on `checkout.session.completed`.

### B1 Fix — Add Check #17
Insert between lines 367-369 in `capital-formulas.ts`:
```typescript
// 17. Stylist exposure
if (inputs.stylistId && inputs.stylistExposure + inputs.requiredInvestmentCents / 100 > policy.maxExposurePerStylist) {
  codes.push(REASON_CODES.stylist_exposure_exceeded);
}
```

| File | Change |
|---|---|
| `src/lib/capital-engine/capital-formulas.ts` | Add check #17 (stylist exposure) |
| `src/components/dashboard/SidebarNavContent.tsx` | Fix qualifying statuses |
| `src/hooks/useOrgCapitalDiagnostics.ts` | Fix qualifying statuses + use org policy + populate real project counts |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Fix qualifying statuses |
| `supabase/functions/create-financing-checkout/index.ts` | Fix initial status to `pending_payment`, validate state transition, read org policy |
| `supabase/functions/financing-webhook/index.ts` | Reject unverified payloads when secret is missing |
| `src/hooks/useZuraCapital.ts` | Pass `stylistId` from opportunity data |

