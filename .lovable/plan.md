

# Make Layer 2 Guardrails Show Real Data Per Organization

## Problem

The Layer 2 (Zura Operational Context) section currently shows static, generic descriptions for all three items:
- "Unresolved critical operational alerts pause new capital surfacing until resolved."
- "This organization has active repayment concerns. Review before proceeding."
- "This organization has active funded projects. Context provided for decision-making."

These tell the admin nothing about the **actual state** of the organization they're inspecting. The data already exists in `useOrgCapitalDiagnostics` — it just isn't surfaced.

## Solution

Replace the static `EligibilityReferenceList` Layer 2 section with a **data-aware** version that reads from the diagnostics query and shows specifics.

## Changes

### 1. `src/hooks/useOrgCapitalDiagnostics.ts`
Expose the data needed for specific descriptions:
- `criticalOpsAlertCount: number` — currently hardcoded to 0 (with existing TODO), keep as-is but surface it
- `repaymentDistress: boolean` + `distressedProjectNames: string[]` — extract project titles/IDs that have `repayment_status === 'delinquent'`
- `activeProjectCount: number` + `activeProjectSummaries: { id, title, status, fundedAmount }[]` — already queried, just expose in the return type

### 2. `src/pages/dashboard/platform/CapitalControlTower.tsx`

**In `DiagnosticPanel`**: Replace the static `EligibilityReferenceList` with a new `OrgOperationalContext` component that receives `data` (the diagnostics result) and renders Layer 2 with real values:

- **Critical Ops Alerts**: 
  - If none: `✓ No critical operational alerts detected`
  - If present: `✗ N critical alert(s) active — [alert types listed]` (future-proofed for when wired)
  
- **Repayment Distress**:
  - If no distress: `✓ No repayment distress — all active projects current`
  - If distress: `⚠ Repayment distress on N project(s): [Project Title 1], [Project Title 2]`

- **Active Projects**:
  - If none: `ℹ No active funded projects`
  - If some: `ℹ N active project(s): [Project Title 1] ($X,XXX funded, status), [Project Title 2] ($Y,YYY funded, status)`

Each item shows a pass/fail/info icon based on actual state, not a static reference icon.

### 3. Keep static `EligibilityReferenceList` for Knowledge Base
The `CapitalKnowledgeBase.tsx` page continues to use the static descriptions since it's a documentation/reference page, not a per-org diagnostic.

## Visual Result

```text
Layer 2 — Zura Operational Context
──────────────────────────────────
✓  No Critical Ops Alerts
   No critical operational alerts detected for this organization.

✓  Repayment Status
   No repayment distress — all active projects are current.

ℹ  Active Projects (2)
   "Downtown Expansion" — $12,500 funded · on_track
   "Retail Lift Program" — $8,000 funded · active
```

Or when there are issues:
```text
⚠  Repayment Distress
   1 project in distress: "Downtown Expansion" (delinquent)
```

## Files

| File | Change |
|---|---|
| `src/hooks/useOrgCapitalDiagnostics.ts` | Add `activeProjectSummaries`, `distressedProjects`, and `criticalOpsAlertCount` to return type |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | New `OrgOperationalContext` component replacing static Layer 2 in diagnostic panel |

