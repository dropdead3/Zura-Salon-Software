

# Zura Capital — Deterministic Formulas Pack

## Current State

Formula logic is scattered across 4 files and multiple UI components:

- **`capital-engine.ts`** — has `clamp`, `computeROE` (uses confidence string + annual lift, not cents), `computeRisk` (uses 0-1 inputs, not 0-100 scores)
- **`financing-engine.ts`** — has `computeVariance`, `computePostFinancingCashFlow` (uses dollars, not cents)
- **`zura-eligibility-engine.ts`** — hardcodes `confidenceToNumber()` mapping, missing checks for `execution_readiness_score`, `operational_stability_score >= 60`, `repayment_distress_flag`, returns free-text reasons not structured reason codes
- **`surface-priority-engine.ts`** — weights differ from spec (0.35 roe vs spec 0.30, missing `break_even_score` and `net_impact_score` terms), staleness penalty thresholds differ (30/60/90 days vs spec 7/14/30)
- **UI inline math** — `CapitalOpportunityDetail.tsx` line 65-69 computes monthly lift/net gain inline; `ZuraCapitalCard.tsx` computes coverage inline

**Missing entirely:**
- ROE score normalization (0-100 from ratio)
- Break-even score
- Confidence score composition (weighted from historical accuracy, stability, readiness, etc.)
- Risk score composition (from stability, uncertainty, project load, etc.)
- Business value score composition
- Net impact score
- Freshness score / freshness multiplier
- Forecast status derivation (with early-stage override)
- Underperformance detection
- Predicted revenue to date (linear pacing)
- Concurrent exposure checks (org/location/stylist level)
- Stylist micro-funding eligibility
- Explanation template mapping from reason codes
- Normalization helpers (`normalize_ratio_to_100`, `normalize_inverse_to_100`, `safe_divide`)

## Architecture

Create one canonical formulas module. All consumers import from it. No inline math.

```text
src/lib/capital-engine/capital-formulas.ts  ← NEW (single source of truth)
src/config/capital-engine/capital-formulas-config.ts  ← NEW (all thresholds/weights)
```

## Build Plan

### 1. Create `capital-formulas-config.ts`

All policy defaults, weights, and thresholds in one file:
- `DEFAULT_POLICY` — roe_threshold, confidence_threshold, max_risk_level, max_concurrent_projects, cooldowns, stylist thresholds, min_operational_stability, min_execution_readiness, stale_days
- `ROE_SCORE_RANGE` — min 0.5, max 3.0
- `BREAK_EVEN_RANGE` — min 0, max 18
- `FRESHNESS_DECAY` — day thresholds and multipliers
- `SURFACE_PRIORITY_WEIGHTS` — spec weights (roe 0.30, confidence 0.20, business_value 0.15, break_even 0.10, momentum 0.10, constraint_severity 0.10, net_impact 0.05)
- `CONFIDENCE_WEIGHTS` — historical_accuracy 0.30, operational_stability 0.20, execution_readiness 0.20, break_even 0.10, momentum 0.10, freshness 0.10
- `RISK_WEIGHTS` — instability 0.25, uncertainty 0.20, underperformance 0.20, project_load 0.15, repayment 0.10, momentum 0.10
- `RISK_LEVEL_THRESHOLDS` — low 0-34, medium 35-59, high 60-79, critical 80-100
- `VARIANCE_THRESHOLDS` — above_forecast 15, on_track_low -10, below_forecast -25
- `COVERAGE_TIERS` — full >= 1.0, strong >= 0.75, partial >= 0.50, weak < 0.50
- `STALENESS_PENALTIES`, `DISMISSAL_PENALTIES`, `COVERAGE_PENALTIES`, `PROJECT_LOAD_PENALTY_PER`
- `CONSTRAINT_SEVERITY_MAP`
- `REASON_CODES` — structured enum of all eligibility failure codes
- `EXPLANATION_TEMPLATES` — deterministic text for each reason code

### 2. Create `capital-formulas.ts` — 22 canonical functions

All pure, deterministic, no side effects:

**Normalization helpers:**
- `clamp(value, min, max)`
- `normalizeRatioTo100(value, minValue, maxValue)`
- `normalizeInverseTo100(value, minValue, maxValue)`
- `safeDivide(numerator, denominator, fallback)`
- `freshnessMultiplier(days)`

**Core scoring:**
- `calculateRoeRatio(predictedLiftCents, investmentCents)` — returns decimal ratio
- `calculateRoeScore(roeRatio)` — returns 0-100 normalized
- `calculateBreakEvenScore(months)` — inverse normalize 0-18 range
- `calculateConfidenceScore(inputs)` — weighted composition, returns 0-100
- `calculateRiskScore(inputs)` — weighted composition, returns 0-100
- `mapRiskLevel(riskScore)` — returns low/medium/high/critical
- `calculateBusinessValueScore(inputs)` — weighted composition placeholder
- `calculateNetMonthlyGainCents(liftExpectedCents, paymentCents, breakEvenMonths)` — cents in, cents out
- `calculateNetImpactScore(netGainCents, investmentCents)` — 0-100
- `calculateCoverageRatio(providerAmountCents, investmentCents)` — ratio + tier label

**Eligibility:**
- `calculateInternalEligibility(inputs, policy)` — returns `{ eligible, reasonCode, reasonSummary }` with structured codes
- `calculateStylistEligibility(inputs, policy)` — separate path

**Surface priority:**
- `calculateSurfacePriority(inputs, penalties)` — single canonical formula, 0-100 clamped
- `calculateFreshnessScore(days)` — inverse normalize 0-30

**Funded project performance:**
- `calculateVariancePercent(actualCents, predictedCents)` — safe divide
- `calculateRoiToDate(revenueCents, repaymentCents, fundedCents)` — ratio
- `calculateRepaymentProgress(repaidCents, totalRepaymentCents)` — percent
- `calculateBreakEvenProgress(revenueCents, totalRepaymentOrFundedCents)` — percent
- `calculateForecastStatus(variancePercent, repaymentDistress, projectAgeDays)` — with early-stage override
- `calculateUnderperformance(forecastStatus, projectAgeDays, variancePercent)` — boolean + suppress flag
- `calculatePredictedRevenueToDateCents(liftExpectedCents, fundingStartDate, breakEvenMonths)` — linear pacing

### 3. Update `surface-priority-engine.ts`

- Replace inline weight constants with imports from `capital-formulas-config.ts`
- Replace inline staleness/urgency functions with calls to `capital-formulas.ts`
- Add `break_even_score` and `net_impact_score` to the priority formula
- Align penalty values with spec (staleness: 0/5/10/20 at 7/14/30/30+ days)
- Add `partial_coverage_penalty` and `project_load_penalty`

### 4. Update `zura-eligibility-engine.ts`

- Replace with call to `calculateInternalEligibility` from formulas module
- Add missing checks: `execution_readiness_score >= 70`, `operational_stability_score >= 60`, `repayment_distress_flag`
- Return structured `reason_code` alongside text
- Keep existing `isZuraEligible` signature but delegate to canonical function

### 5. Update `zura-capital-config.ts`

- Move weights/thresholds that now live in `capital-formulas-config.ts` to avoid duplication
- Keep status labels, state machine transitions, surface areas, event types (those are not formula concerns)
- Re-export from formulas config for backward compat where needed

### 6. Rewire UI consumers

- **`CapitalOpportunityDetail.tsx`** — remove inline `monthlyLift`, `monthlyPayment`, `netMonthly`, `coveragePercent` computation; import and call `calculateNetMonthlyGainCents`, `calculateCoverageRatio`
- **`ZuraCapitalCard.tsx`** — remove inline `coveragePercent` computation; use `calculateCoverageRatio`
- **`CapitalProjectDetail.tsx`** — use `calculateVariancePercent`, `calculateRoiToDate`, `calculateForecastStatus` from formulas
- **`useZuraCapital.ts`** — use `calculateRoeScore`, `calculateSurfacePriority` from formulas module instead of direct `computeSurfacePriority` call; use `calculateInternalEligibility` wrapper

### 7. Update exports

- `src/lib/capital-engine/index.ts` — export all formulas
- `src/config/capital-engine/index.ts` — export formulas config

## Files Created

| File | Purpose |
|---|---|
| `src/config/capital-engine/capital-formulas-config.ts` | All weights, thresholds, reason codes, explanation templates |
| `src/lib/capital-engine/capital-formulas.ts` | 22 canonical formula functions |

## Files Modified

| File | Change |
|---|---|
| `src/lib/capital-engine/surface-priority-engine.ts` | Delegate to formulas, add break_even/net_impact terms |
| `src/lib/capital-engine/zura-eligibility-engine.ts` | Add missing checks, structured reason codes |
| `src/config/capital-engine/zura-capital-config.ts` | Remove duplicated weights, re-export from formulas config |
| `src/hooks/useZuraCapital.ts` | Use canonical scoring functions |
| `src/pages/dashboard/admin/CapitalOpportunityDetail.tsx` | Remove inline math |
| `src/pages/dashboard/admin/CapitalProjectDetail.tsx` | Use canonical performance formulas |
| `src/components/dashboard/capital-engine/ZuraCapitalCard.tsx` | Use canonical coverage computation |
| `src/lib/capital-engine/index.ts` | Export formulas |
| `src/config/capital-engine/index.ts` | Export formulas config |

## Build Order

1. `capital-formulas-config.ts` — all constants
2. `capital-formulas.ts` — all 22 functions
3. Update `surface-priority-engine.ts` and `zura-eligibility-engine.ts` to delegate
4. Update `zura-capital-config.ts` to remove duplicates
5. Rewire `useZuraCapital.ts`
6. Rewire 3 UI components
7. Update exports
8. TypeScript build check

