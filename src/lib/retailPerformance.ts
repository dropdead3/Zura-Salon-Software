/**
 * Retail performance verdict — translates retail metrics into a single ranked
 * advisory line for operators. Pure function, no side effects.
 *
 * Doctrine: Attach rate is the PRIMARY signal — it measures stylist behavior
 * at checkout (the CTA itself). True retail % is downstream of attach rate,
 * basket size, and assortment. We anchor on attach and use true retail % only
 * as a downgrade gate when basket is materially hollow (≥2 tiers below attach).
 *
 * Sub-10% retail mix is treated as a forced critical: at that level the cause
 * is almost always missing recommendations, not pricing or product mix.
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
const SUB_MATERIAL_RETAIL_PERCENT = 10;

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
  strong:
    'Stylists are consistently making the retail recommendation. Protect this routine.',
  healthy:
    'Stylists are recommending retail. One coaching cycle could push attach rate to top quartile.',
  soft:
    'Attach rate is slipping. Stylists are skipping the retail recommendation on too many tickets.',
  critical:
    'Your stylists are likely not selling and need some help. Retail attach is below the threshold where coaching is optional.',
};

export function getRetailPerformanceVerdict(
  trueRetailPercent: number | undefined,
  retailAttachmentRate: number | undefined,
  total: number,
): RetailPerformanceVerdict | null {
  if (total < MATERIALITY_THRESHOLD) return null;
  if (retailAttachmentRate === undefined) return null;

  const attachTier = tierForAttachRate(retailAttachmentRate);
  let tier: RetailPerformanceTier = attachTier;

  // Downgrade gate: if basket is materially hollow (retail % ≥2 tiers below
  // attach), trust the weaker signal — the CTA may be happening but failing
  // to convert into meaningful basket lift.
  if (trueRetailPercent !== undefined) {
    const retailTier = tierForRetailPercent(trueRetailPercent);
    if (TIER_RANK[retailTier] <= TIER_RANK[attachTier] - 2) {
      tier = retailTier;
    }

    // Sub-10% retail mix: force critical regardless of attach. At this level
    // the lever is almost always missing recommendations.
    if (
      trueRetailPercent < SUB_MATERIAL_RETAIL_PERCENT &&
      TIER_RANK[attachTier] <= TIER_RANK.soft
    ) {
      tier = 'critical';
    }
  }

  return { tier, copy: TIER_COPY[tier] };
}
