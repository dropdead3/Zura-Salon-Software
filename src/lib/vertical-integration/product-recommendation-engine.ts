/**
 * Product Recommendation Engine — Pure Computation
 *
 * Ranks products for a service by margin, usage frequency,
 * preferred supplier status, and consistency.
 * No side effects, no API calls.
 */

import { SCORING_WEIGHTS } from '@/config/vertical-integration/integration-config';

export interface ProductPerformanceInput {
  productId: string;
  productName: string;
  supplierName: string;
  isPreferredSupplier: boolean;
  totalUses: number;
  avgQuantityPerUse: number;
  avgServiceRevenue: number;
  avgProductCost: number;
  /** Standard deviation of quantity across uses (for consistency) */
  quantityStddev: number;
}

export interface ProductRecommendation {
  productId: string;
  productName: string;
  supplierName: string;
  isPreferred: boolean;
  score: number;
  marginPct: number;
  marginScore: number;
  frequencyScore: number;
  preferredScore: number;
  consistencyScore: number;
  marginDeltaVsCurrent: number;
}

export interface BrandMarginComparison {
  serviceName: string;
  preferredMarginPct: number;
  alternativeMarginPct: number;
  deltaPp: number;
}

// ── helpers ────────────────────────────────────────────────

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, (value / max) * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── recommendation scoring ────────────────────────────────

export function rankProducts(
  products: ProductPerformanceInput[],
  currentProductId?: string
): ProductRecommendation[] {
  if (products.length === 0) return [];

  const maxUses = Math.max(...products.map((p) => p.totalUses), 1);
  const maxStddev = Math.max(...products.map((p) => p.quantityStddev), 0.01);

  const currentProduct = products.find((p) => p.productId === currentProductId);
  const currentMargin = currentProduct
    ? currentProduct.avgServiceRevenue > 0
      ? ((currentProduct.avgServiceRevenue - currentProduct.avgProductCost) /
          currentProduct.avgServiceRevenue) *
        100
      : 0
    : 0;

  const scored = products.map((p) => {
    const marginPct =
      p.avgServiceRevenue > 0
        ? ((p.avgServiceRevenue - p.avgProductCost) / p.avgServiceRevenue) * 100
        : 0;

    const marginScore = normalize(marginPct, 100);
    const frequencyScore = normalize(p.totalUses, maxUses);
    const preferredScore = p.isPreferredSupplier ? 100 : 0;
    // Consistency = inverse of variance (lower stddev = higher score)
    const consistencyScore = 100 - normalize(p.quantityStddev, maxStddev);

    const score = round2(
      marginScore * SCORING_WEIGHTS.margin +
        frequencyScore * SCORING_WEIGHTS.usageFrequency +
        preferredScore * SCORING_WEIGHTS.preferredBonus +
        consistencyScore * SCORING_WEIGHTS.consistency
    );

    return {
      productId: p.productId,
      productName: p.productName,
      supplierName: p.supplierName,
      isPreferred: p.isPreferredSupplier,
      score,
      marginPct: round2(marginPct),
      marginScore: round2(marginScore),
      frequencyScore: round2(frequencyScore),
      preferredScore,
      consistencyScore: round2(consistencyScore),
      marginDeltaVsCurrent: round2(marginPct - currentMargin),
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

// ── brand margin comparison ───────────────────────────────

export function compareBrandMargins(
  products: ProductPerformanceInput[],
  serviceName: string
): BrandMarginComparison {
  const preferred = products.filter((p) => p.isPreferredSupplier);
  const alternatives = products.filter((p) => !p.isPreferredSupplier);

  const avgMargin = (items: ProductPerformanceInput[]) => {
    if (items.length === 0) return 0;
    const total = items.reduce((sum, p) => {
      return (
        sum +
        (p.avgServiceRevenue > 0
          ? ((p.avgServiceRevenue - p.avgProductCost) / p.avgServiceRevenue) * 100
          : 0)
      );
    }, 0);
    return round2(total / items.length);
  };

  const preferredMarginPct = avgMargin(preferred);
  const alternativeMarginPct = avgMargin(alternatives);

  return {
    serviceName,
    preferredMarginPct,
    alternativeMarginPct,
    deltaPp: round2(preferredMarginPct - alternativeMarginPct),
  };
}
