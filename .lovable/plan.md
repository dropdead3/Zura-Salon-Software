

# Zura Capital — Audit: Gaps and Bugs

## Critical Findings

### BUG 1: Dual Eligibility System — Two Competing Engines

**`zura-eligibility-engine.ts`** (legacy) and **`capital-formulas.ts`** (canonical) both implement eligibility logic, but `useZuraCapital.ts` still calls the **legacy** `isZuraEligible()`. This means the production hook does not use the canonical `calculateInternalEligibility()` from the formulas pack.

Key differences causing inconsistency:
- Legacy engine uses `confidence` as a string (`'high'|'medium'|'low'`) mapped via `confidenceToNumber()`, while canonical uses numeric `confidenceScore` directly
- Legacy `maxStaleDays` is **90** days; canonical `staleDays` is **45** days (per spec)
- Legacy is missing checks for `execution_readiness_score >= 70`, `operational_stability_score >= 60`, `repayment_distress_flag`
- Legacy returns free-text `reasons: string[]`; canonical returns structured `reasonCodes: ReasonCode[]`

**Fix:** Rewire `useZuraCapital.ts` to call `calculateInternalEligibility()` from `capital-formulas.ts` instead of `isZuraEligible()`.

---

### BUG 2: Dual Surface Priority System — Two Competing Engines

**`surface-priority-engine.ts`** still uses its own inline `computeSurfacePriority()` with **different weights and penalties** than the canonical `calculateSurfacePriority()` in `capital-formulas.ts`.

Differences:
- Old engine: ROE normalized by dividing by 5x, not using `calculateRoeScore()`
- Old engine: `breakEven` term uses an urgency proxy, not `calculateBreakEvenScore()`
- Old engine: `netImpact` hardcoded to 50, not computed
- Old engine: staleness penalties at 30/60/90 days (5/15/30), canonical uses 7/14/30 days (0/5/10/20)
- Old engine: project load penalty is `count * 3`, canonical is `count * 10`
- Old engine: dismissal penalty is `count * 5`, canonical uses `min(20, 5 * count)`
- Old engine: missing coverage penalty entirely

`useZuraCapital.ts` imports from the **old** engine. `selectForSurface()` also uses the old engine internally.

**Fix:** Replace `computeSurfacePriority()` internals with delegation to `calculateSurfacePriority()` from `capital-formulas.ts`, or remove the old function entirely and have `useZuraCapital.ts` + `selectForSurface()` call the canonical version.

---

### BUG 3: Exposure Tracking Is Empty (TODO Comment)

In `useZuraCapital.ts` lines 89-91, the exposure computation has a `// TODO` and an empty `forEach`:
```ts
(fundedProjects as any[]).forEach((fp) => {
  // TODO: join with opportunity for location_id if needed
});
```
This means `locationExposure` and `stylistExposure` are always empty objects `{}`, so **exposure limit checks in eligibility always pass** — even when real exposure exceeds policy limits.

**Fix:** Populate `locationExposure` and `stylistExposure` from `capital_funding_projects` joined with their parent `capital_funding_opportunities` for `location_id`/`stylist_id`.

---

### BUG 4: `VARIANCE_THRESHOLDS` Duplicated

`zura-capital-config.ts` defines `VARIANCE_THRESHOLDS` and `getPerformanceStatus()`. `capital-formulas-config.ts` defines `CANONICAL_VARIANCE_THRESHOLDS` and `capital-formulas.ts` defines `calculateForecastStatus()`. These are parallel implementations. Any consumer using the wrong one gets inconsistent status labels.

**Fix:** Remove `VARIANCE_THRESHOLDS` and `getPerformanceStatus()` from `zura-capital-config.ts`; all consumers should use canonical versions.

---

### GAP 5: `SURFACE_COOLDOWN_DEFAULTS` Duplicated

`zura-capital-config.ts` defines `SURFACE_COOLDOWN_DEFAULTS` (with `expansion_planner: 0`). `capital-formulas-config.ts` defines `CANONICAL_SURFACE_COOLDOWNS` (with `expansion_planner: 7`). Different values for the same surface. `surface-priority-engine.ts` imports from `zura-capital-config.ts`.

**Fix:** Remove `SURFACE_COOLDOWN_DEFAULTS` from `zura-capital-config.ts`; use `CANONICAL_SURFACE_COOLDOWNS` everywhere.

---

### GAP 6: `computeCoverageRatio` in Legacy Engine Still Exists

`zura-eligibility-engine.ts` exports `computeCoverageRatio()` which returns `{ ratio, label, covered }`. The canonical `calculateCoverageRatio()` returns `{ ratio, percent, tier, tierLabel }`. Both are exported from `index.ts`. Consumers might use either.

**Fix:** Remove legacy `computeCoverageRatio` from `zura-eligibility-engine.ts` and update any remaining consumers.

---

### GAP 7: `recentDismissals` and `recentDeclines` Always Zero

In `useZuraCapital.ts` line 106-110, `priorityContext` hardcodes:
```ts
recentDismissals: 0,
recentDeclines: 0,
```
This means dismissal and decline penalties never apply to surface priority scoring.

**Fix:** Query `capital_surface_state` for recent dismissals and `capital_event_log` for recent declines to populate these values.

---

### GAP 8: `hasCriticalOperationalAlerts` Always False

`useZuraCapital.ts` line 98 hardcodes `hasCriticalOperationalAlerts: false`. This eligibility check is disabled.

**Fix:** Wire this to actual operational alert state from the ops engine if available, or leave as false with a documented TODO if the alerting system is not yet built.

---

### GAP 9: `lastDeclinedAt` and `lastUnderperformingAt` Always Null

`useZuraCapital.ts` lines 101-102 hardcode both to `null`, disabling decline and underperformance cooldowns entirely.

**Fix:** Query `capital_event_log` for the most recent `funding_declined` event and `capital_funding_projects` for the most recent `at_risk` status to populate these.

---

## Summary of Required Changes

| Priority | Issue | File(s) |
|---|---|---|
| P0 | Rewire eligibility to canonical `calculateInternalEligibility` | `useZuraCapital.ts` |
| P0 | Rewire surface priority to canonical `calculateSurfacePriority` | `surface-priority-engine.ts`, `useZuraCapital.ts` |
| P0 | Populate exposure tracking (remove TODO) | `useZuraCapital.ts` |
| P1 | Remove duplicated `VARIANCE_THRESHOLDS` + `getPerformanceStatus` | `zura-capital-config.ts` |
| P1 | Consolidate `SURFACE_COOLDOWN_DEFAULTS` to canonical | `zura-capital-config.ts`, `surface-priority-engine.ts` |
| P1 | Remove legacy `computeCoverageRatio` | `zura-eligibility-engine.ts`, `index.ts` |
| P1 | Populate `recentDismissals` and `recentDeclines` from data | `useZuraCapital.ts` |
| P2 | Populate `lastDeclinedAt` and `lastUnderperformingAt` from data | `useZuraCapital.ts` |
| P2 | Wire or document `hasCriticalOperationalAlerts` | `useZuraCapital.ts` |

## Build Order

1. **`useZuraCapital.ts`** — Replace `isZuraEligible` with `calculateInternalEligibility`. Replace `computeSurfacePriority` import with canonical `calculateSurfacePriority`. Populate exposure maps from funded projects. Query dismissals/declines from `capital_surface_state` and `capital_event_log`. Populate `lastDeclinedAt`/`lastUnderperformingAt` from event log.
2. **`surface-priority-engine.ts`** — Replace `computeSurfacePriority` internals with delegation to canonical formula. Update `selectForSurface` to use canonical cooldowns.
3. **`zura-capital-config.ts`** — Remove `VARIANCE_THRESHOLDS`, `getPerformanceStatus`, `SURFACE_COOLDOWN_DEFAULTS`. Re-export canonical versions for backward compat if any consumers remain.
4. **`zura-eligibility-engine.ts`** — Remove `computeCoverageRatio`. Keep `isZuraEligible` as a thin wrapper around canonical if needed, or deprecate.
5. **`index.ts`** — Clean up exports to remove legacy duplicates.
6. **TypeScript build check** — Verify no broken imports or type errors.

