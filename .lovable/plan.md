

# Capital Control Tower — Full Eligibility Diagnostics in Dropdown

## Problem

The expanded diagnostic row currently shows only 3 high-level checks (Feature Flag, Qualifying Opportunities, Sidebar Visible) and a simple opportunity table with a single "Top Blocker" column. Platform admins cannot see which of the 19 eligibility checks each opportunity passes or fails.

## Changes

### 1. Enhanced Opportunity Breakdown — `CapitalControlTower.tsx`

Replace the current 4-column opportunity table with an expandable per-opportunity detail view. Each opportunity row will be clickable to reveal a full **19-check eligibility audit** showing pass/fail for every check.

**Per-opportunity expanded view will show:**

```text
┌─────────────────────────────────────────────────────┐
│ ▼ Service Expansion — West Side        surfaced  ✓  │
├─────────────────────────────────────────────────────┤
│  Eligibility Checks (14/19 passed)                  │
│                                                     │
│  ✓ ROE Ratio — 2.4x (threshold: 1.8x)             │
│  ✓ Confidence Score — 82 (threshold: 70)           │
│  ✗ Risk Level — high (max: medium)                 │
│  ✓ Operational Stability — 74 (threshold: 60)      │
│  ✓ Execution Readiness — 85 (threshold: 70)        │
│  ✓ Concurrent Projects — 1 active (max: 2)         │
│  ✓ No Underperforming Projects                     │
│  ✓ No Repayment Distress                           │
│  ✓ Freshness — 12 days (max: 45)                   │
│  ✓ Investment Amount — $15,000                      │
│  ✓ Above Minimum Capital — $15,000 (min: $5,000)   │
│  ✓ Not Expired                                     │
│  ✓ Constraint — capacity_bottleneck                │
│  ✓ Momentum Score — 65 (threshold: 20)             │
│  ✓ No Critical Ops Alerts                          │
│  ✓ Location Exposure — $45K (max: $200K)           │
│  — Stylist Exposure — N/A (no stylist)             │
│  ✓ Decline Cooldown — Clear                        │
│  ✓ Underperformance Cooldown — Clear               │
└─────────────────────────────────────────────────────┘
```

Each check shows the actual value vs. the threshold so admins can see exactly how close or far the org is.

### 2. Enrich Diagnostic Data — `useOrgCapitalDiagnostics.ts`

Add the raw `EligibilityInputs` and the `effectivePolicy` to the `OpportunityDiagnostic` type so the UI can render actual vs. threshold values for each of the 19 checks (not just reason codes).

**Type changes:**
```typescript
export interface OpportunityDiagnostic {
  // ... existing fields
  inputs: EligibilityInputs;   // raw input values
  policy: CapitalPolicy;       // effective policy used
}
```

### 3. Build Check Renderer — `CapitalControlTower.tsx`

A local `EligibilityCheckList` component that takes `inputs`, `policy`, and `eligibility` and renders all 19 checks with:
- Pass (green check) / Fail (red X) / N/A (gray dash) icons
- Human-readable label
- Actual value and threshold displayed inline
- Failed checks sorted to top for quick scanning

## File Summary

| File | Change |
|---|---|
| `src/hooks/useOrgCapitalDiagnostics.ts` | Add `inputs` and `policy` to `OpportunityDiagnostic` return |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Add expandable per-opportunity eligibility checklist with all 19 checks, actual values, and thresholds |

