/**
 * SEO Task Priority Scoring Model.
 *
 * Deterministic: final score = weighted sum of explicit factors.
 * AI is never involved in computing priority.
 *
 * Score range: 0–100
 */

export interface PriorityFactors {
  /** 0–1: How severe is the underlying problem? */
  severity: number;
  /** 0–1: How much upside does completing this task unlock? */
  opportunity: number;
  /** 0–1: Business value of the service-location pair (revenue, margin, growth) */
  businessValue: number;
  /** 0–1: How easy is this task to complete? (1 = very easy) */
  ease: number;
  /** 0–1: Time-sensitivity / freshness urgency */
  freshness: number;
  /** 0–1: Penalty applied when user has too many open SEO tasks */
  fatiguePenalty: number;
}

export interface PriorityWeights {
  severity: number;
  opportunity: number;
  businessValue: number;
  ease: number;
  freshness: number;
  fatiguePenalty: number;
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  severity: 0.25,
  opportunity: 0.25,
  businessValue: 0.20,
  ease: 0.15,
  freshness: 0.10,
  fatiguePenalty: 0.05,
};

/**
 * Compute deterministic priority score from explicit factors.
 * Returns integer 0–100.
 */
export function computePriorityScore(
  factors: PriorityFactors,
  weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS,
): number {
  const raw =
    factors.severity * weights.severity +
    factors.opportunity * weights.opportunity +
    factors.businessValue * weights.businessValue +
    factors.ease * weights.ease +
    factors.freshness * weights.freshness -
    factors.fatiguePenalty * weights.fatiguePenalty;

  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

/**
 * Thresholds for display-tier bucketing.
 */
export const PRIORITY_TIERS = {
  critical: { min: 80, label: 'Critical', color: 'destructive' },
  high: { min: 60, label: 'High', color: 'warning' },
  medium: { min: 40, label: 'Medium', color: 'default' },
  low: { min: 0, label: 'Low', color: 'secondary' },
} as const;

export type PriorityTier = keyof typeof PRIORITY_TIERS;

export function getPriorityTier(score: number): PriorityTier {
  if (score >= PRIORITY_TIERS.critical.min) return 'critical';
  if (score >= PRIORITY_TIERS.high.min) return 'high';
  if (score >= PRIORITY_TIERS.medium.min) return 'medium';
  return 'low';
}
