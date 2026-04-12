

# Capital Engine — Gap, Bug & Enhancement Pass

## Findings

### Bugs

**1. `hasCriticalOpsAlerts` is always hardcoded to `false`**
Both `useOrgCapitalDiagnostics.ts` (line 140) and `useZuraCapital.ts` (line 253) hardcode this to `false`. The guardrail exists in the formula but is never actually evaluated. This means the "No Critical Ops Alerts" check always passes, even if the org has unresolved critical alerts.

Fix: Query for unresolved critical alerts from the operational alerting system (or the relevant table) and pass the real value. If no alerting table exists yet, add a TODO comment that is more prominent and track it as a prerequisite.

**2. `lastDeclinedAt` and `lastUnderperformingAt` are hardcoded to `null` in diagnostics**
`useOrgCapitalDiagnostics.ts` (lines 146-147) passes `null` for both cooldown inputs. The `useZuraCapital.ts` hook correctly derives these from event logs and funded projects. The diagnostics hook skips this, so the Control Tower always shows "Clear" for both cooldowns regardless of actual state.

Fix: Port the same derivation logic from `useZuraCapital.ts` — query `capital_event_log` for `funding_declined` events and check funded project statuses for underperformance.

**3. Edge function `location_id` mapping skipped**
In `detect-capital-opportunities/index.ts` line 116, `location_id` is set to `null` with the comment "location_id is UUID in opps table; loc.id is text — skip for now." This means detected Stripe offers will never match location-based exposure checks or location-based filtering.

Fix: Resolve the type mismatch. If the locations table `id` column is already UUID, just use `loc.id` directly. If not, store the location reference in `provider_offer_details` and add a follow-up migration.

### Gaps

**4. No cron schedule for the detection edge function**
The `detect-capital-opportunities` edge function exists but has no `pg_cron` job configured to run it. It will never execute automatically.

Fix: Create a `pg_cron` schedule (daily or every 6 hours) to invoke the function.

**5. `useZuraCapital.ts` still uses legacy `calculateInternalEligibility` as hard gate**
Line 262 uses the old 19-check function to determine `zuraEligible`. Under the new two-layer model, this should use `calculateOperationalReadiness` for gating and `calculateOpportunityRanking` for display ordering.

Fix: Replace `calculateInternalEligibility` call with `calculateOperationalReadiness` for the `zuraEligible` flag, and add `calculateOpportunityRanking` for sorting.

**6. Control Tower still shows legacy 19-check list for existing opportunities**
The `EligibilityCheckList` component (line 108) still renders all 19 checks as pass/fail gates when an opportunity exists. Under the two-layer model, the UI should separate Stripe requirements (informational) from Zura guardrails (actionable pass/fail) and show ranking factors as scores, not gates.

Fix: Refactor `EligibilityCheckList` to use the two-layer structure: show operational readiness checks as pass/fail, and ranking factors as scored indicators.

### Enhancements

**7. Edge function missing input validation**
No request body or auth validation. Per edge function guidelines, add Zod validation and consider requiring a service-level auth token or API key for the cron caller.

**8. Stripe API version hardcoded**
The edge function uses `"Stripe-Version": "2024-12-18.acacia"` which is hardcoded. This should be extracted to a constant or config.

## Plan

### Step 1 — Fix diagnostics hook (`useOrgCapitalDiagnostics.ts`)
- Query `capital_event_log` for `funding_declined` events to derive `lastDeclinedAt`
- Derive `lastUnderperformingAt` from funded projects with `at_risk` status
- Add a query for critical operational alerts (or add a clear `// TODO: wire to alerting system` with a console.warn when the table doesn't exist yet)

### Step 2 — Update `useZuraCapital.ts` to use two-layer model
- Replace `calculateInternalEligibility` with `calculateOperationalReadiness` for the `zuraEligible` flag
- Add `calculateOpportunityRanking` for sorting/display
- Keep backward-compatible properties on the opportunity object

### Step 3 — Refactor `EligibilityCheckList` in Control Tower
- Split into two sections matching `EligibilityReferenceList` style:
  - Zura Guardrails (6 checks, pass/fail from `operationalReadiness`)
  - Ranking Factors (scored, from `ranking.factors`)
- Remove the flat 19-check layout for existing opportunities

### Step 4 — Fix edge function issues
- Set `location_id` from `loc.id` (verify column type via DB query)
- Add basic input validation
- Extract Stripe API version to a constant

### Step 5 — Schedule the detection cron job
- Enable `pg_cron` and `pg_net` extensions
- Create a cron job to invoke `detect-capital-opportunities` every 6 hours

## File Summary

| File | Change |
|---|---|
| `src/hooks/useOrgCapitalDiagnostics.ts` | Derive `lastDeclinedAt`, `lastUnderperformingAt` from event log; add critical alerts query |
| `src/hooks/useZuraCapital.ts` | Replace `calculateInternalEligibility` with `calculateOperationalReadiness` + `calculateOpportunityRanking` |
| `src/pages/dashboard/platform/CapitalControlTower.tsx` | Refactor `EligibilityCheckList` to two-layer view |
| `supabase/functions/detect-capital-opportunities/index.ts` | Fix `location_id`, add validation, extract Stripe version |
| DB (cron insert) | Schedule detection function via `pg_cron` |

