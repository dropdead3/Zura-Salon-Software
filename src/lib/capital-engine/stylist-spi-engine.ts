/**
 * Stylist SPI & ORS Engine — Pure Computation
 *
 * Deterministic scoring for individual stylist performance,
 * ownership readiness, and career stage assignment.
 * No side effects, no API calls, no AI.
 */

import {
  STYLIST_SPI_WEIGHTS,
  ORS_WEIGHTS,
  CAREER_STAGES,
  ORS_MIN_HISTORY_MONTHS,
  ORS_INSUFFICIENT_HISTORY_PENALTY,
  getSPITierKey,
  type CareerStageKey,
} from '@/config/capital-engine/stylist-financing-config';

/* ── Inputs ── */

export interface StylistSPIInput {
  /** Revenue score 0-100 */
  revenue: number;
  /** Client retention rate score 0-100 */
  retention: number;
  /** Rebooking rate score 0-100 */
  rebooking: number;
  /** Execution discipline score 0-100 (task completion, punctuality) */
  execution: number;
  /** Growth trend score 0-100 (month-over-month trajectory) */
  growth: number;
  /** Review quality score 0-100 (ratings, mentions) */
  review: number;
}

export interface ORSInput {
  /** Array of recent monthly SPI scores (newest first) */
  spiHistory: number[];
  /** Leadership score 0-100 (task completion, mentoring signals) */
  leadershipScore: number;
  /** Demand stability score 0-100 (inverse booking velocity variance) */
  demandStability: number;
}

/* ── Results ── */

export interface StylistSPIResult {
  spiScore: number;
  revenueScore: number;
  retentionScore: number;
  rebookingScore: number;
  executionScore: number;
  growthScore: number;
  reviewScore: number;
  tier: string;
}

export interface ORSResult {
  orsScore: number;
  spiAverage: number;
  consistencyScore: number;
  leadershipScore: number;
  demandStability: number;
  careerStage: CareerStageKey;
  financingEligible: boolean;
  ownershipEligible: boolean;
}

/* ── Computation ── */

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Compute Stylist Performance Index (0-100).
 */
export function computeStylistSPI(input: StylistSPIInput): StylistSPIResult {
  const r = clamp(input.revenue);
  const ret = clamp(input.retention);
  const reb = clamp(input.rebooking);
  const exe = clamp(input.execution);
  const gro = clamp(input.growth);
  const rev = clamp(input.review);

  const spiScore = Math.round(
    r * STYLIST_SPI_WEIGHTS.revenue +
    ret * STYLIST_SPI_WEIGHTS.retention +
    reb * STYLIST_SPI_WEIGHTS.rebooking +
    exe * STYLIST_SPI_WEIGHTS.execution +
    gro * STYLIST_SPI_WEIGHTS.growth +
    rev * STYLIST_SPI_WEIGHTS.review,
  );

  return {
    spiScore: clamp(spiScore),
    revenueScore: Math.round(r),
    retentionScore: Math.round(ret),
    rebookingScore: Math.round(reb),
    executionScore: Math.round(exe),
    growthScore: Math.round(gro),
    reviewScore: Math.round(rev),
    tier: getSPITierKey(spiScore),
  };
}

/**
 * Compute consistency as inverse CV of SPI history.
 * Perfect consistency → 100. High variance → lower score.
 */
function computeConsistency(spiHistory: number[]): number {
  if (spiHistory.length < 2) return 50; // fallback with penalty
  const mean = spiHistory.reduce((a, b) => a + b, 0) / spiHistory.length;
  if (mean === 0) return 0;
  const variance = spiHistory.reduce((sum, v) => sum + (v - mean) ** 2, 0) / spiHistory.length;
  const cv = Math.sqrt(variance) / mean;
  // cv=0 → 100, cv=0.5 → 0
  return clamp(Math.round((1 - cv * 2) * 100));
}

/**
 * Compute Ownership Readiness Score (0-100).
 */
export function computeORS(input: ORSInput): ORSResult {
  const historyLen = input.spiHistory.length;
  const hasEnoughHistory = historyLen >= ORS_MIN_HISTORY_MONTHS;

  const spiAvg = historyLen > 0
    ? input.spiHistory.reduce((a, b) => a + b, 0) / historyLen
    : 0;

  const rawConsistency = computeConsistency(input.spiHistory);
  const consistency = hasEnoughHistory
    ? rawConsistency
    : Math.round(rawConsistency * ORS_INSUFFICIENT_HISTORY_PENALTY);

  const leadership = clamp(input.leadershipScore);
  const demand = clamp(input.demandStability);

  const rawORS =
    spiAvg * ORS_WEIGHTS.spiAverage +
    consistency * ORS_WEIGHTS.consistency +
    leadership * ORS_WEIGHTS.leadership +
    demand * ORS_WEIGHTS.demandStability;

  const orsScore = clamp(Math.round(rawORS));

  const careerStage = determineCareerStage(spiAvg, orsScore, leadership, consistency);
  const ownershipEligible = orsScore >= (CAREER_STAGES.owner.orsMin ?? 85);
  const financingEligible = spiAvg >= (CAREER_STAGES.high_performer.spiMin ?? 70);

  return {
    orsScore,
    spiAverage: Math.round(spiAvg),
    consistencyScore: consistency,
    leadershipScore: Math.round(leadership),
    demandStability: Math.round(demand),
    careerStage,
    financingEligible,
    ownershipEligible,
  };
}

/**
 * Deterministic career stage assignment.
 */
export function determineCareerStage(
  spi: number,
  ors: number,
  leadershipScore: number,
  consistencyScore: number,
): CareerStageKey {
  if (spi >= CAREER_STAGES.owner.spiMin && ors >= (CAREER_STAGES.owner.orsMin ?? 85)) {
    return 'owner';
  }
  if (
    spi >= CAREER_STAGES.operator.spiMin &&
    ors >= (CAREER_STAGES.operator.orsMin ?? 70) &&
    consistencyScore >= (CAREER_STAGES.operator.consistencyMin ?? 70)
  ) {
    return 'operator';
  }
  if (spi >= CAREER_STAGES.lead.spiMin && leadershipScore >= (CAREER_STAGES.lead.leadershipMin ?? 60)) {
    return 'lead';
  }
  if (spi >= CAREER_STAGES.high_performer.spiMin) {
    return 'high_performer';
  }
  return 'stylist';
}
