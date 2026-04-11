/**
 * Market Domination Mode configuration.
 * Score weights, strategy thresholds, and category stacking logic.
 */

export type DominationStrategy = 'attack' | 'expand' | 'defend' | 'abandon';

/** Weights for domination score components (must sum to 1.0) */
export const DOMINATION_SCORE_WEIGHTS = {
  reviewDominance: 0.30,
  contentDominance: 0.20,
  pageStrength: 0.20,
  conversionStrength: 0.15,
  competitorSuppression: 0.15,
} as const;

/** Strategy state thresholds */
export const DOMINATION_STRATEGY_THRESHOLDS = {
  defend: { minScore: 80 },
  expand: { minScore: 60, maxScore: 79 },
  attack: { minScore: 40, maxScore: 79 },
  abandon: { maxScore: 39 },
} as const;

/** Strategy state display configuration */
export const DOMINATION_STRATEGY_CONFIG: Record<DominationStrategy, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  defend: {
    label: 'DEFEND',
    description: 'Dominant position — maintain and protect market share',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  expand: {
    label: 'EXPAND',
    description: 'Competitive position — widen the lead',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  attack: {
    label: 'ATTACK',
    description: 'Winnable market — push aggressively for dominance',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  abandon: {
    label: 'ABANDON',
    description: 'Low ROI relative to other markets — reallocate effort',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border',
  },
};

/** Domination score interpretation bands */
export const DOMINATION_SCORE_BANDS = [
  { min: 80, max: 100, label: 'Dominant', color: 'text-blue-400' },
  { min: 60, max: 79, label: 'Competitive', color: 'text-emerald-400' },
  { min: 40, max: 59, label: 'Emerging', color: 'text-amber-400' },
  { min: 0, max: 39, label: 'Weak', color: 'text-muted-foreground' },
] as const;

/** Market demand estimation factor: review_count × avg_ticket × this factor */
export const MARKET_DEMAND_CONVERSION_FACTOR = 2.5;

/** Minimum demand threshold (in dollars) for a target to avoid Abandon state */
export const MIN_DEMAND_THRESHOLD = 5000;

/** Category stacking: how many points above defend threshold before suggesting next target */
export const CATEGORY_STACKING_BUFFER = 5;

export function getScoreBand(score: number) {
  return DOMINATION_SCORE_BANDS.find(b => score >= b.min && score <= b.max) ?? DOMINATION_SCORE_BANDS[3];
}
