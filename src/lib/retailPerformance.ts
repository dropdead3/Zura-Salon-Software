/**
 * Retail performance verdict — translates retail metrics into a single ranked
 * advisory line for operators. Pure function, no side effects.
 *
 * Tiers anchored to industry benchmarks (10–20% retail mix, 30–50% attach rate)
 * and the StylistLevelsEditor retail target. Worst-of logic between True Retail %
 * and Attach Rate prevents oversell when one metric is weak.
 *
 * Materiality gate: returns null below $500 total revenue or when attach rate
 * is unavailable. Silence is valid output.
 */

export type RetailPerformanceTier = 'strong' | 'healthy' | 'soft' | 'critical';

export interface RetailPerformanceVerdict {
  tier: RetailPerformanceTier;
  copy: string;
}

const MATERIALITY_THRESHOLD = 500;

function tierForRetailPercent(pct: number): RetailPerformanceTier {
  if (pct >= 15) return 'strong';
  if (pct >= 10) return 'healthy';
  if (pct >= 5) return 'soft';
  return 'critical';
}

function tierForAttachRate(rate: number): RetailPerformanceTier {
  if (rate >= 40) return 'strong';
  if (rate >= 30) return 'healthy';
  if (rate >= 15) return 'soft';
  return 'critical';
}

const TIER_RANK: Record<RetailPerformanceTier, number> = {
  critical: 0,
  soft: 1,
  healthy: 2,
  strong: 3,
};

const TIER_COPY: Record<RetailPerformanceTier, string> = {
  strong: 'Retail is pulling its weight. Protect the merchandising routine.',
  healthy: 'Retail is on benchmark. One coaching cycle could push to top quartile.',
  soft: 'Retail is underperforming. The lever is attach rate at checkout, not assortment.',
  critical: 'Retail is a margin leak. Audit the recommendation step in the service flow.',
};

export function getRetailPerformanceVerdict(
  trueRetailPercent: number | undefined,
  retailAttachmentRate: number | undefined,
  total: number,
): RetailPerformanceVerdict | null {
  if (total < MATERIALITY_THRESHOLD) return null;
  if (retailAttachmentRate === undefined) return null;
  if (trueRetailPercent === undefined) return null;

  const retailTier = tierForRetailPercent(trueRetailPercent);
  const attachTier = tierForAttachRate(retailAttachmentRate);
  const tier: RetailPerformanceTier =
    TIER_RANK[retailTier] <= TIER_RANK[attachTier] ? retailTier : attachTier;

  return { tier, copy: TIER_COPY[tier] };
}
