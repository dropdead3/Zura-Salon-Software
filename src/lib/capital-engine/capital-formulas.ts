/**
 * Zura Capital — Deterministic Formulas Pack
 *
 * Single source of truth for all capital scoring, eligibility,
 * surfacing, and funded-project evaluation.
 *
 * All functions are pure, deterministic, no side effects.
 * All consumers must import from this module — no inline math.
 */

import {
  ROE_SCORE_RANGE,
  BREAK_EVEN_RANGE,
  FRESHNESS_DECAY,
  FRESHNESS_FLOOR_MULTIPLIER,
  CANONICAL_SURFACE_PRIORITY_WEIGHTS,
  CONFIDENCE_WEIGHTS,
  RISK_WEIGHTS,
  RISK_LEVEL_THRESHOLDS,
  CANONICAL_VARIANCE_THRESHOLDS,
  COVERAGE_TIERS,
  STALENESS_PENALTIES,
  STALENESS_PENALTY_FLOOR,
  DISMISSAL_PENALTY_PER,
  DISMISSAL_PENALTY_MAX,
  COVERAGE_PENALTIES,
  PROJECT_LOAD_PENALTY_PER,
  CANONICAL_CONSTRAINT_SEVERITY,
  CONSTRAINT_SEVERITY_DEFAULT,
  NET_IMPACT_RATIO_MAX,
  DEFAULT_CAPITAL_POLICY,
  REASON_CODES,
  EXPLANATION_TEMPLATES,
  BUSINESS_VALUE_WEIGHTS,
  CANONICAL_SURFACE_COOLDOWNS,
  type CanonicalRiskLevel,
  type CoverageTier,
  type ForecastStatus,
  type CapitalPolicy,
  type ReasonCode,
} from '@/config/capital-engine/capital-formulas-config';

/* ════════════════════════════════════════════════
   NORMALIZATION HELPERS
   ════════════════════════════════════════════════ */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRatioTo100(value: number, minValue: number, maxValue: number): number {
  if (maxValue === minValue) return 0;
  return clamp(((value - minValue) / (maxValue - minValue)) * 100, 0, 100);
}

export function normalizeInverseTo100(value: number, minValue: number, maxValue: number): number {
  return 100 - normalizeRatioTo100(value, minValue, maxValue);
}

export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  if (denominator === 0 || !isFinite(denominator)) return fallback;
  const result = numerator / denominator;
  return isFinite(result) ? result : fallback;
}

export function freshnessMultiplier(days: number): number {
  for (const tier of FRESHNESS_DECAY) {
    if (days <= tier.maxDays) return tier.multiplier;
  }
  return FRESHNESS_FLOOR_MULTIPLIER;
}

/* ════════════════════════════════════════════════
   CORE SCORING
   ════════════════════════════════════════════════ */

/** ROE ratio: predicted lift / investment. Returns decimal (e.g. 2.30). */
export function calculateRoeRatio(predictedLiftCents: number, investmentCents: number): number {
  return safeDivide(predictedLiftCents, investmentCents, 0);
}

/** ROE score: normalized 0–100 from ratio. */
export function calculateRoeScore(roeRatio: number): number {
  if (roeRatio < ROE_SCORE_RANGE.min) return 0;
  if (roeRatio >= ROE_SCORE_RANGE.max) return 100;
  return Math.round(normalizeRatioTo100(roeRatio, ROE_SCORE_RANGE.min, ROE_SCORE_RANGE.max));
}

/** Break-even score: 0–100, lower months = higher score. */
export function calculateBreakEvenScore(months: number): number {
  return Math.round(normalizeInverseTo100(months, BREAK_EVEN_RANGE.min, BREAK_EVEN_RANGE.max));
}

/** Freshness score: 0–100, newer = higher. Normalized over 30-day window. */
export function calculateFreshnessScore(days: number): number {
  return Math.round(normalizeInverseTo100(days, 0, 30));
}

/** Opportunity freshness in days from detected_at. */
export function calculateOpportunityFreshnessDays(detectedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(detectedAt).getTime()) / (1000 * 60 * 60 * 24)));
}

/* ── Confidence Score ── */

export interface ConfidenceScoreInputs {
  historicalPredictionAccuracyScore: number;  // 0–100
  operationalStabilityScore: number;          // 0–100
  executionReadinessScore: number;            // 0–100
  breakEvenMonths: number;
  momentumScore: number;                      // 0–100
  freshnessdays: number;
}

export function calculateConfidenceScore(inputs: ConfidenceScoreInputs): number {
  const w = CONFIDENCE_WEIGHTS;
  const breakEvenNorm = calculateBreakEvenScore(inputs.breakEvenMonths);
  const freshnessNorm = calculateFreshnessScore(inputs.freshnessdays);

  const raw =
    inputs.historicalPredictionAccuracyScore * w.historicalAccuracy +
    inputs.operationalStabilityScore * w.operationalStability +
    inputs.executionReadinessScore * w.executionReadiness +
    breakEvenNorm * w.breakEven +
    inputs.momentumScore * w.momentum +
    freshnessNorm * w.freshness;

  return Math.round(clamp(raw, 0, 100));
}

/* ── Risk Score ── */

export interface RiskScoreInputs {
  operationalStabilityScore: number;        // 0–100
  confidenceScore: number;                  // 0–100
  activeCapitalProjectsCount: number;
  activeUnderperformingProjectsCount: number;
  repaymentDistressFlag: boolean;
  momentumScore: number;                    // 0–100
}

export function calculateRiskScore(inputs: RiskScoreInputs): number {
  const w = RISK_WEIGHTS;

  const instabilityRisk = 100 - inputs.operationalStabilityScore;
  const uncertaintyRisk = 100 - inputs.confidenceScore;
  const projectLoadRisk = normalizeRatioTo100(inputs.activeCapitalProjectsCount, 0, 4);
  const underperformanceRisk = inputs.activeUnderperformingProjectsCount > 0 ? 80 : 0;
  const repaymentRisk = inputs.repaymentDistressFlag ? 100 : 0;
  const momentumRisk = 100 - inputs.momentumScore;

  const raw =
    instabilityRisk * w.instability +
    uncertaintyRisk * w.uncertainty +
    underperformanceRisk * w.underperformance +
    projectLoadRisk * w.projectLoad +
    repaymentRisk * w.repayment +
    momentumRisk * w.momentum;

  return Math.round(clamp(raw, 0, 100));
}

/** Map a numeric risk score to a canonical risk level. */
export function mapRiskLevel(riskScore: number): CanonicalRiskLevel {
  if (riskScore >= RISK_LEVEL_THRESHOLDS.critical.min) return 'critical';
  if (riskScore >= RISK_LEVEL_THRESHOLDS.high.min) return 'high';
  if (riskScore >= RISK_LEVEL_THRESHOLDS.medium.min) return 'medium';
  return 'low';
}

/* ── Business Value Score ── */

export interface BusinessValueInputs {
  serviceMarginScore: number;          // 0–100
  revenuePotentialScore: number;       // 0–100
  strategicServiceWeightScore: number; // 0–100
  locationPriorityScore: number;       // 0–100
}

export function calculateBusinessValueScore(inputs: BusinessValueInputs): number {
  const w = BUSINESS_VALUE_WEIGHTS;
  const raw =
    inputs.serviceMarginScore * w.serviceMargin +
    inputs.revenuePotentialScore * w.revenuePotential +
    inputs.strategicServiceWeightScore * w.strategicServiceWeight +
    inputs.locationPriorityScore * w.locationPriority;

  return Math.round(clamp(raw, 0, 100));
}

/* ── Net Monthly Gain ── */

export function calculateNetMonthlyGainCents(
  liftExpectedCents: number,
  paymentCents: number,
  breakEvenMonths: number,
): number {
  const monthlyLift = safeDivide(liftExpectedCents, Math.max(1, Math.round(breakEvenMonths)), 0);
  return Math.round(monthlyLift - paymentCents);
}

/** Expected monthly lift in cents. */
export function calculateMonthlyLiftCents(liftExpectedCents: number, breakEvenMonths: number): number {
  return Math.round(safeDivide(liftExpectedCents, Math.max(1, Math.round(breakEvenMonths)), 0));
}

/** Net impact score: 0–100 normalized. */
export function calculateNetImpactScore(netGainCents: number, investmentCents: number): number {
  if (netGainCents <= 0) return 0;
  const ratio = safeDivide(netGainCents, investmentCents, 0);
  return Math.round(normalizeRatioTo100(ratio, 0, NET_IMPACT_RATIO_MAX));
}

/* ── Coverage Ratio ── */

export interface CoverageResult {
  ratio: number;
  percent: number;
  tier: CoverageTier;
  tierLabel: string;
}

export function calculateCoverageRatio(providerAmountCents: number | null, investmentCents: number): CoverageResult {
  if (!providerAmountCents || investmentCents <= 0) {
    return { ratio: 0, percent: 0, tier: 'weak', tierLabel: COVERAGE_TIERS.weak.label };
  }
  const ratio = safeDivide(providerAmountCents, investmentCents, 0);
  const percent = Math.round(ratio * 100);

  let tier: CoverageTier = 'weak';
  if (ratio >= COVERAGE_TIERS.full.min) tier = 'full';
  else if (ratio >= COVERAGE_TIERS.strong.min) tier = 'strong';
  else if (ratio >= COVERAGE_TIERS.partial.min) tier = 'partial';

  return { ratio, percent, tier, tierLabel: COVERAGE_TIERS[tier].label };
}

/* ════════════════════════════════════════════════
   ELIGIBILITY
   ════════════════════════════════════════════════ */

export interface EligibilityInputs {
  roeRatio: number;
  confidenceScore: number;
  riskLevel: string;
  operationalStabilityScore: number;
  executionReadinessScore: number;
  activeCapitalProjectsCount: number;
  activeUnderperformingProjectsCount: number;
  repaymentDistressFlag: boolean;
  opportunityFreshnessDays: number;
  requiredInvestmentCents: number;
  constraintType: string | null;
  momentumScore: number | null;
  hasCriticalOpsAlerts: boolean;
  expiresAt: string | null;
  // Exposure
  locationId: string | null;
  locationExposure: number;
  stylistId: string | null;
  stylistExposure: number;
  // Cooldowns
  lastDeclinedAt: string | null;
  lastUnderperformingAt: string | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reasonCodes: ReasonCode[];
  reasonSummaries: string[];
  topReasonCode: ReasonCode | null;
  topReasonSummary: string | null;
}

const ALLOWED_RISK_LEVELS: Record<CanonicalRiskLevel, number> = {
  low: 1, medium: 2, high: 3, critical: 4,
};

function riskLevelRank(level: string): number {
  return ALLOWED_RISK_LEVELS[level as CanonicalRiskLevel] ?? 99;
}

export function calculateInternalEligibility(
  inputs: EligibilityInputs,
  policy: CapitalPolicy = DEFAULT_CAPITAL_POLICY,
): EligibilityResult {
  const codes: ReasonCode[] = [];

  // 1. ROE
  if (inputs.roeRatio < policy.roeThreshold) {
    codes.push(REASON_CODES.low_roe);
  }

  // 2. Confidence
  if (inputs.confidenceScore < policy.confidenceThreshold) {
    codes.push(REASON_CODES.low_confidence);
  }

  // 3. Risk level
  if (riskLevelRank(inputs.riskLevel) > riskLevelRank(policy.maxRiskLevel)) {
    codes.push(REASON_CODES.risk_too_high);
  }

  // 4. Operational stability
  if (inputs.operationalStabilityScore < policy.minOperationalStability) {
    codes.push(REASON_CODES.instability);
  }

  // 5. Execution readiness
  if (inputs.executionReadinessScore < policy.minExecutionReadiness) {
    codes.push(REASON_CODES.execution_not_ready);
  }

  // 6. Concurrent projects
  if (inputs.activeCapitalProjectsCount >= policy.maxConcurrentProjects) {
    codes.push(REASON_CODES.too_many_active_projects);
  }

  // 7. Underperforming
  if (inputs.activeUnderperformingProjectsCount > 0) {
    codes.push(REASON_CODES.underperforming_project_exists);
  }

  // 8. Repayment distress
  if (inputs.repaymentDistressFlag) {
    codes.push(REASON_CODES.repayment_distress);
  }

  // 9. Staleness
  if (inputs.opportunityFreshnessDays > policy.staleDays) {
    codes.push(REASON_CODES.opportunity_stale);
  }

  // 10. Invalid investment
  if (inputs.requiredInvestmentCents <= 0) {
    codes.push(REASON_CODES.invalid_investment);
  }

  // 11. Capital below minimum
  if (inputs.requiredInvestmentCents > 0 && inputs.requiredInvestmentCents / 100 < policy.minCapitalRequired) {
    codes.push(REASON_CODES.capital_below_minimum);
  }

  // 12. Expired
  if (inputs.expiresAt && new Date(inputs.expiresAt) < new Date()) {
    codes.push(REASON_CODES.opportunity_expired);
  }

  // 13. No constraint type
  if (!inputs.constraintType) {
    codes.push(REASON_CODES.no_constraint_type);
  }

  // 14. Momentum decline
  if (inputs.momentumScore != null && inputs.momentumScore < 20) {
    codes.push(REASON_CODES.momentum_decline);
  }

  // 15. Critical ops alerts
  if (inputs.hasCriticalOpsAlerts) {
    codes.push(REASON_CODES.critical_ops_alerts);
  }

  // 16. Location exposure
  if (inputs.locationId && inputs.locationExposure + inputs.requiredInvestmentCents / 100 > policy.maxExposurePerLocation) {
    codes.push(REASON_CODES.location_exposure_exceeded);
  }


  // 18. Decline cooldown
  if (inputs.lastDeclinedAt) {
    const daysSince = Math.floor((Date.now() - new Date(inputs.lastDeclinedAt).getTime()) / 86400000);
    if (daysSince < policy.cooldownAfterDeclineDays) {
      codes.push(REASON_CODES.decline_cooldown);
    }
  }

  // 19. Underperformance cooldown
  if (inputs.lastUnderperformingAt) {
    const daysSince = Math.floor((Date.now() - new Date(inputs.lastUnderperformingAt).getTime()) / 86400000);
    if (daysSince < policy.cooldownAfterUnderperformanceDays) {
      codes.push(REASON_CODES.underperformance_cooldown);
    }
  }

  const summaries = codes.map(c => EXPLANATION_TEMPLATES[c] ?? c);

  return {
    eligible: codes.length === 0,
    reasonCodes: codes,
    reasonSummaries: summaries,
    topReasonCode: codes[0] ?? null,
    topReasonSummary: summaries[0] ?? null,
  };
}


/* ════════════════════════════════════════════════
   SURFACE PRIORITY
   ════════════════════════════════════════════════ */

export interface SurfacePriorityInputs {
  roeScore: number;           // 0–100
  confidenceScore: number;    // 0–100
  businessValueScore: number; // 0–100
  breakEvenScore: number;     // 0–100
  momentumScore: number;      // 0–100
  constraintType: string | null;
  netImpactScore: number;     // 0–100
}

export interface SurfacePriorityPenalties {
  freshnessDays: number;
  recentDismissCount: number;
  coverageRatio: number;
  activeProjectCount: number;
}

export function calculateSurfacePriority(
  inputs: SurfacePriorityInputs,
  penalties: SurfacePriorityPenalties,
): number {
  const w = CANONICAL_SURFACE_PRIORITY_WEIGHTS;

  const constraintNorm = inputs.constraintType
    ? (CANONICAL_CONSTRAINT_SEVERITY[inputs.constraintType] ?? CONSTRAINT_SEVERITY_DEFAULT)
    : CONSTRAINT_SEVERITY_DEFAULT;

  const rawScore =
    inputs.roeScore * w.roe +
    inputs.confidenceScore * w.confidence +
    inputs.businessValueScore * w.businessValue +
    inputs.breakEvenScore * w.breakEven +
    inputs.momentumScore * w.momentum +
    constraintNorm * w.constraintSeverity +
    inputs.netImpactScore * w.netImpact;

  // Staleness penalty
  let penalty = 0;
  let applied = false;
  for (const tier of STALENESS_PENALTIES) {
    if (penalties.freshnessDays <= tier.maxDays) {
      penalty += tier.penalty;
      applied = true;
      break;
    }
  }
  if (!applied) penalty += STALENESS_PENALTY_FLOOR;

  // Dismissal penalty
  if (penalties.recentDismissCount > 0) {
    penalty += Math.min(DISMISSAL_PENALTY_MAX, DISMISSAL_PENALTY_PER * penalties.recentDismissCount);
  }

  // Coverage penalty
  if (penalties.coverageRatio < 0.5) {
    penalty += COVERAGE_PENALTIES.weak;
  } else if (penalties.coverageRatio < 0.75) {
    penalty += COVERAGE_PENALTIES.partial;
  }

  // Project load penalty
  penalty += PROJECT_LOAD_PENALTY_PER * penalties.activeProjectCount;

  return Math.round(clamp(rawScore - penalty, 0, 100));
}

/* ════════════════════════════════════════════════
   FUNDED PROJECT PERFORMANCE
   ════════════════════════════════════════════════ */

/** Variance percent: (actual - predicted) / predicted * 100 */
export function calculateVariancePercent(actualCents: number, predictedCents: number): number | null {
  if (predictedCents === 0) return null;
  return Math.round(((actualCents - predictedCents) / Math.max(1, Math.abs(predictedCents))) * 1000) / 10;
}

/** ROI to date: (revenue - repayment) / funded. Returns ratio. */
export function calculateRoiToDate(revenueCents: number, repaymentCents: number, fundedCents: number): number {
  return safeDivide(revenueCents - repaymentCents, fundedCents, 0);
}

/** Repayment progress percent */
export function calculateRepaymentProgress(repaidCents: number, totalRepaymentCents: number): number {
  return Math.round(safeDivide(repaidCents * 100, totalRepaymentCents, 0));
}

/** Break-even progress percent */
export function calculateBreakEvenProgress(revenueCents: number, totalRepaymentOrFundedCents: number): number {
  return Math.round(safeDivide(revenueCents * 100, Math.max(1, totalRepaymentOrFundedCents), 0));
}

/** Forecast status with early-stage override. */
export function calculateForecastStatus(
  variancePercent: number | null,
  repaymentDistress: boolean,
  projectAgeDays: number,
): ForecastStatus {
  // Early-stage override
  if (projectAgeDays < 14 && !repaymentDistress) {
    return 'early_tracking';
  }

  if (repaymentDistress) return 'at_risk';
  if (variancePercent == null) return 'early_tracking';

  if (variancePercent >= CANONICAL_VARIANCE_THRESHOLDS.aboveForecast) return 'above_forecast';
  if (variancePercent > CANONICAL_VARIANCE_THRESHOLDS.onTrackLow) return 'on_track';
  if (variancePercent > CANONICAL_VARIANCE_THRESHOLDS.belowForecast) return 'below_forecast';
  return 'at_risk';
}

/** Underperformance detection: should suppress future funding? */
export function calculateUnderperformance(
  forecastStatus: ForecastStatus,
  projectAgeDays: number,
  variancePercent: number | null,
): { underperforming: boolean; suppress: boolean } {
  if (forecastStatus === 'at_risk') {
    return { underperforming: true, suppress: true };
  }
  if (
    forecastStatus === 'below_forecast' &&
    projectAgeDays >= 30 &&
    variancePercent != null &&
    variancePercent <= -20
  ) {
    return { underperforming: true, suppress: true };
  }
  return { underperforming: false, suppress: false };
}

/** Predicted revenue to date using linear pacing. */
export function calculatePredictedRevenueToDateCents(
  liftExpectedCents: number,
  fundingStartDate: string,
  breakEvenMonths: number,
): number {
  const daysSinceFunding = Math.max(0, Math.floor((Date.now() - new Date(fundingStartDate).getTime()) / 86400000));
  const breakEvenDays = breakEvenMonths * 30;
  const progressRatio = clamp(safeDivide(daysSinceFunding, breakEvenDays, 0), 0, 1);
  return Math.round(liftExpectedCents * progressRatio);
}

/** Cooldown until date for a given surface area. */
export function calculateCooldownUntil(surfaceArea: string, now: Date = new Date()): Date {
  const days = CANONICAL_SURFACE_COOLDOWNS[surfaceArea] ?? 7;
  const result = new Date(now);
  result.setDate(result.getDate() + days);
  return result;
}
