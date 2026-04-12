

# Zura Capital — Master Build Audit and Gap Remediation Plan

## What Already Exists (Healthy)

**Core formulas layer** — `capital-formulas.ts` and `capital-formulas-config.ts` implement all 22 canonical functions (ROE, confidence, risk, eligibility, surface priority, forecast status, underperformance). All engines delegate to canonical formulas.

**Primary data model** — `capital_funding_opportunities` and `capital_funding_projects` tables with all required fields (investment cents, lift predictions, ROE, confidence, risk, eligibility status, provider fields, surface priority).

**Hook layer** — `useZuraCapital` fetches opportunities, computes canonical eligibility and surface priority, tracks exposure/dismissals/declines from real data.

**Admin routes** — `/admin/capital` (queue), `/admin/capital/opportunities/:id` (detail), `/admin/capital/projects` (list), `/admin/capital/projects/:id` (detail), `/admin/capital/settings` (policy).

**Command Center** — `ZuraCapitalCard` shows top eligible opportunity with coverage ratio, ROE, lift. Logs surfacing and view events.

**Edge functions** — `create-financing-checkout` (Stripe checkout with server-side eligibility) and `financing-webhook` (handles checkout.session.completed, updates project status).

**Supporting infrastructure** — Event logging, surface state/dismissals, policy settings CRUD, status badges, metric tiles, queue filters, summary strip.

---

## Gaps Requiring Remediation

### GAP 1: `BlurredAmount` Missing on Capital Pages (P1)

The previous audit fixed components (`ZuraCapitalCard`, `FundingOpportunityDetail`, etc.) but the **page files** were never wrapped:
- `CapitalQueue.tsx` — 6 `formatCurrency` calls unwrapped
- `CapitalOpportunityDetail.tsx` — 8+ `formatCurrency` calls unwrapped
- `CapitalProjectDetail.tsx` — 8+ `formatCurrency` calls unwrapped
- `CapitalProjects.tsx` — 4+ `formatCurrency` calls unwrapped

**Fix:** Wrap all `formatCurrency` outputs in `BlurredAmount` across these 4 page files.

### GAP 2: `useZuraCapital` Not Wired to Org Policy Settings (P2)

`useZuraCapital` calls `calculateInternalEligibility` with default policy. The `useCapitalPolicySettings` hook exists but is never consumed in the scoring path. Org-specific thresholds (custom ROE minimums, max concurrent projects, etc.) are ignored.

**Fix:** Import and use `useCapitalPolicySettings` in `useZuraCapital` to pass org overrides to `calculateInternalEligibility`.

### GAP 3: Execution Plan Section Missing from Opportunity Detail (P2)

The master prompt requires: "Detail page must include: Execution Plan". `CapitalOpportunityDetail.tsx` has Growth Math, Funding Availability, Net Impact, Why This Exists, and Timeline — but no Execution Plan section showing what happens if funded (tasks, campaigns, inventory workflows).

**Fix:** Add an "Execution Plan" card with deterministic preview based on `opportunity_type` (e.g., capacity_expansion → "Add chairs + update scheduling", inventory → "Purchase order + restock workflow").

### GAP 4: Linked Work Section Missing from Project Detail (P2)

`CapitalProjectDetail.tsx` tracks performance/repayment/forecast but has no "Linked Work" section showing related campaigns, tasks, or inventory orders triggered by funding.

**Fix:** Add a "Linked Work" placeholder section. Query by `funding_project_id` if relationships exist, otherwise show empty state.

### GAP 5: `FundThisDialog` Uses Legacy Types/Formulas (P1)

`FundThisDialog.tsx` still imports `QueuedOpportunity` from the old `capital-engine.ts` and uses `computePostFinancingCashFlow` from the legacy `financing-engine.ts` (which uses dollars, not cents). This is a different data shape than the production `ZuraCapitalOpportunity`.

**Fix:** Refactor `FundThisDialog` to accept `ZuraCapitalOpportunity` or the raw opportunity record, and use canonical formulas for cash flow display.

### GAP 6: Edge Function Eligibility Thresholds Differ from Canonical (P1)

`create-financing-checkout` hardcodes `THRESHOLDS = { minROE: 1.5, ... }` while canonical is `1.8`. The edge function also checks `minCapitalCents: 500_000` (i.e., $5,000) which doesn't match any canonical config constant. Missing checks: confidence >= 70, operational stability >= 60, execution readiness >= 70, freshness <= 45 days, repayment distress.

**Fix:** Align edge function thresholds with `DEFAULT_CAPITAL_POLICY` values. Add missing server-side eligibility checks.

### GAP 7: No Post-Funding Activation System (P2)

The master prompt requires: "Funding must trigger: task creation, campaign launch, inventory workflow, capacity expansion, expansion plan. No manual steps required." Currently, the webhook sets `activation_status: 'pending'` but nothing picks it up. No activation service or background job exists.

**Fix:** This is a significant subsystem. For now, add a placeholder activation handler in the webhook that logs an `activation_pending` event and sets status. The full activation engine (auto-creating tasks/campaigns) is a Phase 2 build item — document it clearly.

### GAP 8: No Contextual Surfacing in Operations Hub, Service Dashboard, or Stylist Dashboard (P2)

The master prompt lists 6 surfaces. Only Command Center (#1) and Capital Queue (#6) are built. Operations Hub (#2), Service Dashboard (#3), Stylist Dashboard (#4), and Expansion Planner (#5) have no capital integration.

**Fix:** This is Phase 2 scope per the approved UI architecture plan. No action needed now, but add TODO comments in relevant hub files.

### GAP 9: Missing Components from Master Prompt (P2)

Spec calls for: `OperationalCapitalCard`, `StylistCapitalOpportunityCard`, `CapitalFundingConfirmModal`, `FundedProjectPerformanceCard`. These don't exist yet.

- `OperationalCapitalCard` — Phase 2 (Operations Hub surfacing)
- `StylistCapitalOpportunityCard` — Phase 3 (stylist micro-funding)
- `CapitalFundingConfirmModal` — `FundThisDialog` serves this role but needs refactoring (GAP 5)
- `FundedProjectPerformanceCard` — `FinancedProjectsTracker` partially covers this

**Fix:** Rename/refactor `FundThisDialog` to `CapitalFundingConfirmModal` for spec alignment. Others are future phases.

---

## Build Order

1. **BlurredAmount on 4 page files** — `CapitalQueue`, `CapitalOpportunityDetail`, `CapitalProjectDetail`, `CapitalProjects`
2. **Wire org policy to useZuraCapital** — Import `useCapitalPolicySettings`, map to eligibility policy override
3. **Fix FundThisDialog** — Accept production types, use canonical formulas, rename to `CapitalFundingConfirmModal`
4. **Align edge function thresholds** — Update `create-financing-checkout` to match canonical policy (ROE 1.8, add confidence/stability/readiness checks)
5. **Add Execution Plan section** — Placeholder in `CapitalOpportunityDetail`
6. **Add Linked Work section** — Placeholder in `CapitalProjectDetail`
7. **TypeScript build check**

## Files Modified

| File | Change |
|---|---|
| `src/pages/dashboard/admin/CapitalQueue.tsx` | Add BlurredAmount wrapping |
| `src/pages/dashboard/admin/CapitalOpportunityDetail.tsx` | Add BlurredAmount + Execution Plan section |
| `src/pages/dashboard/admin/CapitalProjectDetail.tsx` | Add BlurredAmount + Linked Work section |
| `src/pages/dashboard/admin/CapitalProjects.tsx` | Add BlurredAmount wrapping |
| `src/hooks/useZuraCapital.ts` | Wire org policy settings |
| `src/components/dashboard/capital-engine/FundThisDialog.tsx` | Refactor to canonical types, rename |
| `supabase/functions/create-financing-checkout/index.ts` | Align thresholds with canonical policy |

## Out of Scope (Future Phases)

- Operations Hub capital card (Phase 2)
- Service Dashboard contextual surfacing (Phase 2)
- Stylist Dashboard capital card (Phase 3)
- Expansion Planner integration (Phase 2)
- Full post-funding activation engine (Phase 2)
- Background jobs for opportunity detection, eligibility evaluation, provider checks (Phase 2)

