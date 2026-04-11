/**
 * Ownership Engine — Pure computation layer for ZOS, eligibility, and capital recycling.
 */

import { ZOS_WEIGHTS, getZOSEligibility, type ZOSEligibility, type HardFilterResults, HARD_FILTER_DEFAULTS } from '@/config/capital-engine/ownership-config';

/* ── ZOS Computation ── */

export interface ZOSInput {
  spiAverage: number;          // 0–100
  consistencyScore: number;    // 0–100
  executionReliability: number;// 0–100
  growthResponsiveness: number;// 0–100
  teamStability: number;       // 0–100
  marketPosition: number;      // 0–100
}

export interface ZOSResult {
  zosScore: number;
  eligibility: ZOSEligibility;
  components: ZOSInput;
}

export function computeZOS(input: ZOSInput): ZOSResult {
  const score = Math.round(
    input.spiAverage * ZOS_WEIGHTS.spiPerformance +
    input.consistencyScore * ZOS_WEIGHTS.consistency +
    input.executionReliability * ZOS_WEIGHTS.executionReliability +
    input.growthResponsiveness * ZOS_WEIGHTS.growthResponsiveness +
    input.teamStability * ZOS_WEIGHTS.teamStability +
    input.marketPosition * ZOS_WEIGHTS.marketPosition
  );

  const clamped = Math.max(0, Math.min(100, score));
  return {
    zosScore: clamped,
    eligibility: getZOSEligibility(clamped),
    components: input,
  };
}

/* ── Hard Filters ── */

export interface HardFilterInput {
  monthlyRevenue: number;
  reviewCount: number;
  momentumPositive: boolean;
  operationallyStable: boolean;
}

export function evaluateHardFilters(
  input: HardFilterInput,
  thresholds = HARD_FILTER_DEFAULTS
): HardFilterResults {
  const revenuePass = input.monthlyRevenue >= thresholds.minMonthlyRevenue;
  const reviewPass = input.reviewCount >= thresholds.minReviewCount;
  const momentumPass = !thresholds.requirePositiveMomentum || input.momentumPositive;
  const stabilityPass = !thresholds.requireOperationalStability || input.operationallyStable;
  return {
    revenuePass,
    reviewPass,
    momentumPass,
    stabilityPass,
    allPass: revenuePass && reviewPass && momentumPass && stabilityPass,
  };
}

export function determineEligibility(zosScore: number, hardFilters: HardFilterResults): ZOSEligibility {
  if (!hardFilters.allPass) return 'ineligible';
  return getZOSEligibility(zosScore);
}

/* ── Capital Recycling ── */

export interface LedgerEntry {
  entryType: 'investment' | 'return' | 'reinvestment';
  amount: number;
}

export interface CapitalRecyclingMetrics {
  totalDeployed: number;
  totalReturned: number;
  totalReinvested: number;
  netROIMultiple: number;
}

export function computeCapitalRecycling(entries: LedgerEntry[]): CapitalRecyclingMetrics {
  let totalDeployed = 0;
  let totalReturned = 0;
  let totalReinvested = 0;

  for (const e of entries) {
    switch (e.entryType) {
      case 'investment':
        totalDeployed += e.amount;
        break;
      case 'return':
        totalReturned += e.amount;
        break;
      case 'reinvestment':
        totalReinvested += e.amount;
        break;
    }
  }

  return {
    totalDeployed,
    totalReturned,
    totalReinvested,
    netROIMultiple: totalDeployed > 0 ? Math.round((totalReturned / totalDeployed) * 100) / 100 : 0,
  };
}

/* ── Pipeline Summary ── */

export interface PipelineSummary {
  observe: number;
  qualify: number;
  offer: number;
  convert: number;
  scale: number;
  total: number;
}

export function computePipelineSummary(stages: string[]): PipelineSummary {
  const counts: PipelineSummary = { observe: 0, qualify: 0, offer: 0, convert: 0, scale: 0, total: stages.length };
  for (const s of stages) {
    if (s in counts && s !== 'total') {
      (counts as any)[s]++;
    }
  }
  return counts;
}

/* ── Consistency Score Helper ── */

/**
 * Computes a consistency score (0–100) from a coefficient of variation.
 * Lower CV → higher consistency.
 */
export function consistencyFromCV(coefficientOfVariation: number): number {
  // CV of 0 → 100, CV of 1.0+ → 0
  const score = Math.round(Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100)));
  return score;
}
