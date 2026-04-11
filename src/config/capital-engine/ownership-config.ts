/**
 * Ownership Layer Configuration
 * ZOS weights, eligibility thresholds, hard filter minimums, deal/pipeline labels.
 */

/* ── ZOS Component Weights (must sum to 1.0) ── */
export const ZOS_WEIGHTS = {
  spiPerformance: 0.30,
  consistency: 0.20,
  executionReliability: 0.15,
  growthResponsiveness: 0.15,
  teamStability: 0.10,
  marketPosition: 0.10,
} as const;

/* ── Eligibility Thresholds ── */
export const ZOS_ELIGIBILITY = {
  prime: { min: 85, label: 'Prime', description: 'Top-tier candidate for partnership' },
  watchlist: { min: 70, label: 'Watchlist', description: 'Strong but not yet eligible' },
  ineligible: { min: 0, label: 'Ineligible', description: 'Does not meet minimum criteria' },
} as const;

export type ZOSEligibility = keyof typeof ZOS_ELIGIBILITY;

export function getZOSEligibility(score: number): ZOSEligibility {
  if (score >= ZOS_ELIGIBILITY.prime.min) return 'prime';
  if (score >= ZOS_ELIGIBILITY.watchlist.min) return 'watchlist';
  return 'ineligible';
}

/* ── Hard Filters ── */
export const HARD_FILTER_DEFAULTS = {
  minMonthlyRevenue: 30_000,
  minReviewCount: 50,
  requirePositiveMomentum: true,
  requireOperationalStability: true,
} as const;

export type HardFilterResults = {
  revenuePass: boolean;
  reviewPass: boolean;
  momentumPass: boolean;
  stabilityPass: boolean;
  allPass: boolean;
};

/* ── Deal Types ── */
export const DEAL_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  revenue_share: { label: 'Revenue Share', description: 'Zura funds growth, takes % of incremental revenue' },
  equity_stake: { label: 'Equity Stake', description: 'Zura invests capital, takes % ownership' },
  full_acquisition: { label: 'Full Acquisition', description: 'Zura acquires majority or full control' },
};

/* ── Pipeline Stages ── */
export const PIPELINE_STAGE_LABELS: Record<string, { label: string; order: number }> = {
  observe: { label: 'Observe', order: 0 },
  qualify: { label: 'Qualify', order: 1 },
  offer: { label: 'Offer', order: 2 },
  convert: { label: 'Convert', order: 3 },
  scale: { label: 'Scale', order: 4 },
};

export const PIPELINE_STAGES_ORDERED = ['observe', 'qualify', 'offer', 'convert', 'scale'] as const;
