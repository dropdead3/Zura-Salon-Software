

# Zura Capital — Pre-Build Audit Pass

## Findings

### BUG 1: `FundingOpportunityDetail` Dialog Still Uses Inline Math (P1)

`FundingOpportunityDetail.tsx` lines 57-65 compute monthly lift, monthly payment, and net monthly using raw division instead of canonical formulas. The page version (`CapitalOpportunityDetail.tsx`) correctly uses `calculateMonthlyLiftCents` and `calculateCoverageRatio`, but the dialog version does not. This means the same opportunity shows different net impact numbers depending on whether the user opens it from the Command Center dialog vs the dedicated page route.

**Fix:** Replace inline math in `FundingOpportunityDetail.tsx` with `calculateMonthlyLiftCents`, `calculateNetMonthlyGainCents`, and `calculateCoverageRatio` from `capital-formulas.ts`.

---

### BUG 2: Financial Values Missing `BlurredAmount` Wrapper (P1)

Per UI Canon, all monetary values must be wrapped in `BlurredAmount` for privacy toggle support. None of the 5 capital pages or the embedded components use `BlurredAmount`. This affects: `CapitalQueue.tsx`, `CapitalOpportunityDetail.tsx`, `CapitalProjectDetail.tsx`, `CapitalProjects.tsx`, `ZuraCapitalCard.tsx`, `OwnerCapitalQueue.tsx`, `FundingOpportunityDetail.tsx`, `FinancedProjectsTracker.tsx`.

**Fix:** Wrap all `formatCurrency()` outputs in `BlurredAmount` across capital UI surfaces.

---

### GAP 3: `ZURA_ELIGIBILITY_THRESHOLDS` Is Orphaned and Inconsistent (P2)

`zura-capital-config.ts` still defines `ZURA_ELIGIBILITY_THRESHOLDS` with `maxStaleDays: 90` (canonical is 45). No consumers import it, so it is dead code that could mislead future development.

**Fix:** Remove `ZURA_ELIGIBILITY_THRESHOLDS` from `zura-capital-config.ts`.

---

### GAP 4: Three Orphaned Files (P2)

- `CapitalDashboard.tsx` — no longer imported anywhere (removed from SEO Workshop)
- `useCapitalEngine.ts` — no longer imported anywhere (superseded by `useZuraCapital`)
- `CapitalPriorityQueue.tsx` — no longer imported anywhere

These are dead code that add confusion.

**Fix:** Delete these 3 files.

---

### GAP 5: `CapitalQueue` Page Doesn't Use `useCapitalPolicySettings` for Eligibility Display (P2)

The queue page shows all opportunities but doesn't indicate which ones are ineligible vs eligible in a way that respects the org's actual policy settings. The eligibility check in `useZuraCapital` uses `DEFAULT_CAPITAL_POLICY` from the formulas config rather than the org's saved policy from `capital_policy_settings` table.

**Fix:** Have `useZuraCapital` accept an optional policy override, and pass the org's settings from `useCapitalPolicySettings` when available. This ensures eligibility reflects the org's actual thresholds, not just platform defaults.

---

### GAP 6: `OwnerCapitalQueue` Opens Dialog Instead of Navigating to Page Route (P1)

The `OwnerCapitalQueue` component (used in the embedded `CapitalDashboard` context, though currently orphaned) still opens a `FundingOpportunityDetail` dialog on click rather than navigating to `/admin/capital/opportunities/:id`. The new `CapitalQueue` page correctly uses `Link` to navigate. If `OwnerCapitalQueue` is re-used in any embedded surface in the future, it should also navigate to the detail page.

**Fix:** This is low-priority since `OwnerCapitalQueue` is only used in the orphaned `CapitalDashboard`. If we keep it for future embedded use, update it to navigate. If not, it's covered by GAP 4 cleanup.

---

### GAP 7: `CapitalProjectDetail` Missing Linked Work Section (P2)

The spec calls for a `FundedProjectLinkedWorkPanel` showing linked campaigns, task batches, inventory orders, expansion plans. The current `CapitalProjectDetail.tsx` has no linked work section — just performance, repayment, forecast, and timeline.

**Fix:** Add a "Linked Work" section. For now, query related campaigns or tasks by `funding_project_id` if such a relationship exists in the schema, or show an empty state placeholder.

---

### GAP 8: `CapitalOpportunityDetail` Missing Execution Plan Section (P2)

The spec calls for `FundingOpportunityExecutionPlanBlock` previewing what happens if funding is accepted (linked campaigns, task batches, etc.). Current page has no such section.

**Fix:** Add an "Execution Plan" section with a placeholder or deterministic preview based on opportunity type.

---

## Summary

| Priority | Issue | File(s) |
|---|---|---|
| P1 | Dialog uses inline math, not canonical formulas | `FundingOpportunityDetail.tsx` |
| P1 | Missing `BlurredAmount` on all monetary values | 8 files across pages + components |
| P2 | Remove orphaned `ZURA_ELIGIBILITY_THRESHOLDS` | `zura-capital-config.ts` |
| P2 | Delete 3 orphaned files | `CapitalDashboard.tsx`, `useCapitalEngine.ts`, `CapitalPriorityQueue.tsx` |
| P2 | Eligibility uses platform defaults, not org policy | `useZuraCapital.ts` |
| P2 | Missing Linked Work section on project detail | `CapitalProjectDetail.tsx` |
| P2 | Missing Execution Plan section on opportunity detail | `CapitalOpportunityDetail.tsx` |

## Build Order

1. Fix `FundingOpportunityDetail.tsx` inline math — replace with canonical formulas
2. Wrap all monetary values in `BlurredAmount` across 8 capital UI files
3. Wire `useZuraCapital` to accept org policy from `useCapitalPolicySettings`
4. Add Execution Plan placeholder section to `CapitalOpportunityDetail.tsx`
5. Add Linked Work placeholder section to `CapitalProjectDetail.tsx`
6. Remove `ZURA_ELIGIBILITY_THRESHOLDS` from `zura-capital-config.ts`
7. Delete 3 orphaned files
8. TypeScript build check

