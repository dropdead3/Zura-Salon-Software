

# Capital Control Tower — Show 19-Check Reference When No Opportunities Exist

## Problem

The 19-check eligibility checklist only renders when an org has actual `capital_funding_opportunities` records. For orgs like Drop Dead Salons with zero opportunities, admins see only the 3 visibility checks and a "No opportunities detected" warning — with no visibility into what the qualification criteria even are.

## Change

### `src/pages/dashboard/platform/CapitalControlTower.tsx`

When `data.flagEnabled && data.opportunities.length === 0`, replace the current bare warning message with a **reference checklist** showing all 19 eligibility criteria with their policy thresholds. This uses the org's effective policy (or default) and renders each check in a neutral/informational style (no pass/fail since there's no opportunity to evaluate — just the criterion name and threshold).

Layout:
```text
⚠ No opportunities have been detected for this organization yet.

Eligibility Reference — What Gets Checked
  When an opportunity is detected, it must pass all 19 checks:

  · ROE Ratio — must be ≥ 1.8x
  · Confidence Score — must be ≥ 70
  · Risk Level — must be ≤ medium
  · Operational Stability — must be ≥ 60
  · Execution Readiness — must be ≥ 70
  · Concurrent Projects — must be < 2
  · No Underperforming Projects
  · No Repayment Distress
  · Opportunity Freshness — must be ≤ 45 days
  · Investment Amount — must be > $0
  · Above Minimum Capital — must be ≥ $5,000
  · Not Expired
  · Constraint Type — must be identified
  · Momentum Score — must be ≥ 20
  · No Critical Ops Alerts
  · Location Exposure — must be ≤ $200,000
  · Stylist Exposure — must be ≤ $100,000
  · Decline Cooldown — 14 day wait
  · Underperformance Cooldown — 30 day wait
```

Each line uses the **actual policy values** from the org's `capital_policy_settings` (or defaults), so admins see the real thresholds that would apply.

### Implementation

Add a new `EligibilityReferenceList` component that:
- Takes the effective `CapitalPolicy` from the diagnostics hook (already available via `data.policy` on each opportunity — we'll also expose the org-level policy from the hook)
- Renders each criterion with a neutral info icon (not pass/fail) and the threshold value
- Displays below the "No opportunities detected" warning

Also update `useOrgCapitalDiagnostics.ts` to return the `effectivePolicy` at the top level of the diagnostics result (not just per-opportunity), so the reference list can access it even when there are zero opportunities.

## File Summary

| File | Change |
|---|---|
| `src/hooks/useOrgCapitalDiagnostics.ts` | Add `effectivePolicy: CapitalPolicy` to the top-level return type |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Add `EligibilityReferenceList` component; render it in the zero-opportunities state |

