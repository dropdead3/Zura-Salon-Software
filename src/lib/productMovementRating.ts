// Pure utility for computing product movement ratings from sales velocity data.
// Used across inventory settings, analytics hub, and public shop.

export type MovementTier = 'best_seller' | 'popular' | 'steady' | 'slow_mover' | 'stagnant' | 'dead_weight';

export interface MovementRating {
  tier: MovementTier;
  label: string;
  /** Semantic color key for badge styling */
  colorClass: string;
  /** Border color for badge */
  borderClass: string;
  /** Background tint */
  bgClass: string;
  /** Tooltip description */
  tooltip: string;
  /** Numeric sort order (lower = better) */
  sortOrder: number;
}

export interface VelocityInput {
  /** Units sold per day in analysis period */
  velocity: number;
  /** Total units sold in analysis period */
  totalUnitsSold: number;
  /** Days since last sale (null = never sold) */
  daysSinceLastSale: number | null;
  /** Whether product has stock on hand */
  hasStock: boolean;
  /** Percentile rank among all products (0-100, 100 = highest velocity) */
  velocityPercentile: number;
  /** Optional weighted velocity (3:2:1 decay) — preferred for tier classification when provided */
  weightedVelocity?: number;
}

const TIER_CONFIG: Record<MovementTier, Omit<MovementRating, 'tooltip'>> = {
  best_seller: {
    tier: 'best_seller',
    label: 'Best Seller',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    bgClass: 'bg-emerald-500/10',
    sortOrder: 1,
  },
  popular: {
    tier: 'popular',
    label: 'Popular',
    colorClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-200 dark:border-blue-800',
    bgClass: 'bg-blue-500/10',
    sortOrder: 2,
  },
  steady: {
    tier: 'steady',
    label: 'Steady',
    colorClass: 'text-muted-foreground',
    borderClass: 'border-border',
    bgClass: 'bg-muted/50',
    sortOrder: 3,
  },
  slow_mover: {
    tier: 'slow_mover',
    label: 'Slow Mover',
    colorClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800',
    bgClass: 'bg-amber-500/10',
    sortOrder: 4,
  },
  stagnant: {
    tier: 'stagnant',
    label: 'Stagnant',
    colorClass: 'text-orange-600 dark:text-orange-400',
    borderClass: 'border-orange-200 dark:border-orange-800',
    bgClass: 'bg-orange-500/10',
    sortOrder: 5,
  },
  dead_weight: {
    tier: 'dead_weight',
    label: 'Dead Weight',
    colorClass: 'text-red-500 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-800',
    bgClass: 'bg-red-500/10',
    sortOrder: 6,
  },
};

/**
 * Compute the movement rating for a product.
 * Uses weightedVelocity when provided for more accurate tier classification.
 * Products with zero stock are excluded from negative ratings.
 */
export function getMovementRating(input: VelocityInput): MovementRating {
  const { velocity, daysSinceLastSale, hasStock, velocityPercentile, weightedVelocity } = input;
  // Prefer weighted velocity for tier thresholds
  const effectiveVelocity = weightedVelocity ?? velocity;

  // Positive tiers (apply regardless of stock)
  if (velocityPercentile >= 90 && effectiveVelocity > 0.5) {
    return {
      ...TIER_CONFIG.best_seller,
      tooltip: `Top 10% velocity · ${effectiveVelocity.toFixed(2)} units/day${weightedVelocity != null ? ' (weighted)' : ''}`,
    };
  }
  if (velocityPercentile >= 75 && effectiveVelocity > 0.2) {
    return {
      ...TIER_CONFIG.popular,
      tooltip: `Top 25% velocity · ${effectiveVelocity.toFixed(2)} units/day${weightedVelocity != null ? ' (weighted)' : ''}`,
    };
  }
  if (effectiveVelocity > 0.05) {
    return {
      ...TIER_CONFIG.steady,
      tooltip: `${effectiveVelocity.toFixed(2)} units/day — selling regularly${weightedVelocity != null ? ' (weighted)' : ''}`,
    };
  }

  // Negative tiers — only if product has stock (can't sell what you don't have)
  if (!hasStock) {
    return {
      ...TIER_CONFIG.steady,
      tooltip: 'Out of stock — rating paused',
    };
  }

  if (effectiveVelocity > 0) {
    return {
      ...TIER_CONFIG.slow_mover,
      tooltip: `${effectiveVelocity.toFixed(3)} units/day — consider promotion`,
    };
  }

  // Zero velocity
  if (daysSinceLastSale != null && daysSinceLastSale < 180) {
    return {
      ...TIER_CONFIG.stagnant,
      tooltip: `No sales in ${daysSinceLastSale} days — needs attention`,
    };
  }

  return {
    ...TIER_CONFIG.dead_weight,
    tooltip: daysSinceLastSale != null
      ? `No sales in ${daysSinceLastSale}+ days — consider discontinuing`
      : 'Never sold — consider discontinuing',
  };
}

/**
 * Given a Map of product velocities and a list of all velocities,
 * compute percentile ranks.
 */
export function computePercentiles(velocities: number[]): Map<number, number> {
  const sorted = [...velocities].filter(v => v > 0).sort((a, b) => a - b);
  const result = new Map<number, number>();
  if (sorted.length === 0) return result;

  for (const v of velocities) {
    if (v <= 0) {
      result.set(v, 0);
    } else {
      const rank = sorted.filter(s => s <= v).length;
      result.set(v, (rank / sorted.length) * 100);
    }
  }
  return result;
}

/** All available tiers for filter dropdowns */
export const MOVEMENT_TIERS: { value: MovementTier; label: string }[] = [
  { value: 'best_seller', label: 'Best Seller' },
  { value: 'popular', label: 'Popular' },
  { value: 'steady', label: 'Steady' },
  { value: 'slow_mover', label: 'Slow Mover' },
  { value: 'stagnant', label: 'Stagnant' },
  { value: 'dead_weight', label: 'Dead Weight' },
];

/** Get the tier config for use without velocity input (e.g. legend) */
export function getTierConfig(tier: MovementTier) {
  return TIER_CONFIG[tier];
}
