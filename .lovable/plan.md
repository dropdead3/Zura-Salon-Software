

# Add Third-Party POS Diagnostic Note to Capital Control Tower

## Problem

When an organization like Drop Dead Salons processes payments through Phorest Pay (a third-party POS with its own Stripe Connect relationship), the Capital Control Tower shows "No locations connected to Zura Pay" but doesn't explain **why** this matters or that the org is actively processing payments through another platform. This leaves platform admins without the context needed to advise the organization.

## Solution

Add a contextual diagnostic note that detects when an organization has Phorest-connected locations but no Zura Pay connections, and explains why Capital cannot surface for that configuration.

## Changes

### 1. `src/hooks/useOrgCapitalDiagnostics.ts`
- Extend the `locations` query to also select `phorest_branch_id`
- Add two new fields to `OrgCapitalDiagnostics`:
  - `phorestConnectedLocationCount: number` — count of locations with a `phorest_branch_id`
  - `usesThirdPartyPOS: boolean` — true when phorest locations exist but no Zura Pay connections
- Derive `usesThirdPartyPOS` from: `phorestConnectedLocationCount > 0 && !hasActiveStripeConnect`

### 2. `src/pages/dashboard/platform/CapitalControlTower.tsx` — `DiagnosticPanel`
- After the "Zura Pay Connected" check item, insert a conditional diagnostic note when `data.usesThirdPartyPOS` is true
- Styled as an amber info box with clear explanation:
  - **Title**: "Third-Party Payment Processor Detected"
  - **Detail**: "This organization processes payments through Phorest Pay (X locations connected). Stripe Capital eligibility is determined by the platform that owns the Stripe Connect relationship. Since Phorest — not Zura — is the platform of record, Zura's API keys cannot access this organization's processing history or Capital offers. To qualify for Zura Capital, the organization would need to migrate payment processing to Zura Pay."

### Visual Treatment
- Amber-bordered card matching the existing operational context styling
- `AlertTriangle` icon consistent with existing advisory patterns
- Placed inline within the Visibility Checklist, directly after the "Zura Pay Connected" row (only when relevant)

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useOrgCapitalDiagnostics.ts` | Add `phorest_branch_id` to query, add 2 new fields |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Add conditional third-party POS note in DiagnosticPanel |

2 files. No database changes. No new dependencies.

