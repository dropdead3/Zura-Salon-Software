/**
 * Market Domination Engine.
 * Pure computation: Domination Score, strategy state, market share, city momentum, campaign generation.
 * No side effects, no database calls.
 */

import {
  DOMINATION_SCORE_WEIGHTS,
  DOMINATION_STRATEGY_THRESHOLDS,
  MARKET_DEMAND_CONVERSION_FACTOR,
  MIN_DEMAND_THRESHOLD,
  type DominationStrategy,
} from '@/config/seo-engine/seo-domination-config';
import type { MomentumDirection } from './seo-momentum-calculator';

// ── Input types ──

export interface DominationTargetInput {
  targetId: string;
  city: string;
  serviceCategory: string;
  microMarketKeywords: string[];
}

export interface DominationSignals {
  /** Org review count for this city-service */
  orgReviewCount: number;
  /** Competitor review count for this city-service */
  competitorReviewCount: number;
  /** Org content page count */
  orgContentPageCount: number;
  /** Competitor content page count */
  competitorContentPageCount: number;
  /** Average page health score (0–100) across contributing objects */
  avgPageHealth: number;
  /** Average conversion health score (0–100) */
  avgConversionHealth: number;
  /** Average competitive gap score (0–100, higher = bigger gap = worse) */
  avgCompetitorGap: number;
  /** Contributing location IDs */
  contributingLocationIds: string[];
  /** Total attributed revenue for this city-service */
  attributedRevenue: number;
  /** Average ticket price */
  avgTicket: number;
  /** Aggregated momentum score for objects in this target */
  momentumScore?: number;
  /** Momentum direction */
  momentumDirection?: MomentumDirection;
}

// ── Output types ──

export interface DominationScoreResult {
  targetId: string;
  dominationScore: number;
  reviewDominance: number;
  contentDominance: number;
  pageStrength: number;
  conversionStrength: number;
  competitorSuppression: number;
  visibleMarketShare: number;
  capturedRevenueShare: number;
  strategyState: DominationStrategy;
  estimatedMarketDemand: number;
  contributingLocationIds: string[];
  factors: Record<string, unknown>;
}

export interface CityMomentumResult {
  city: string;
  score: number;
  direction: MomentumDirection;
  targetCount: number;
  topTarget: string;
}

export interface DominationCampaignSuggestion {
  targetId: string;
  city: string;
  serviceCategory: string;
  strategyState: DominationStrategy;
  estimatedOpportunity: number;
  suggestedDurationDays: number;
  locationTaskDistribution: Array<{
    locationId: string;
    focusAreas: string[];
  }>;
}

export interface CategoryStackingSuggestion {
  completedTargetId: string;
  nextTargetId: string;
  nextCity: string;
  nextServiceCategory: string;
  nextScore: number;
  directive: string;
}

// ── Core Computations ──

/**
 * Compute domination score from signals.
 */
export function computeDominationScore(
  target: DominationTargetInput,
  signals: DominationSignals,
): DominationScoreResult {
  const w = DOMINATION_SCORE_WEIGHTS;

  // Review dominance: org share of total reviews, scaled to 0–100
  const totalReviews = signals.orgReviewCount + signals.competitorReviewCount;
  const reviewDominance = totalReviews > 0
    ? Math.round((signals.orgReviewCount / totalReviews) * 100)
    : 0;

  // Content dominance: org share of content pages, scaled to 0–100
  const totalContent = signals.orgContentPageCount + signals.competitorContentPageCount;
  const contentDominance = totalContent > 0
    ? Math.round((signals.orgContentPageCount / totalContent) * 100)
    : 0;

  // Page strength: direct health score (already 0–100)
  const pageStrength = Math.round(signals.avgPageHealth);

  // Conversion strength: direct health score (already 0–100)
  const conversionStrength = Math.round(signals.avgConversionHealth);

  // Competitor suppression: inverse of gap (high gap = low suppression)
  const competitorSuppression = Math.round(Math.max(0, 100 - signals.avgCompetitorGap));

  // Weighted domination score
  const dominationScore = Math.round(
    reviewDominance * w.reviewDominance +
    contentDominance * w.contentDominance +
    pageStrength * w.pageStrength +
    conversionStrength * w.conversionStrength +
    competitorSuppression * w.competitorSuppression,
  );

  // Market share estimates
  const visibleMarketShare = totalReviews > 0
    ? signals.orgReviewCount / totalReviews
    : 0;

  const estimatedMarketDemand = totalReviews * signals.avgTicket * MARKET_DEMAND_CONVERSION_FACTOR;

  const capturedRevenueShare = estimatedMarketDemand > 0
    ? Math.min(1, signals.attributedRevenue / estimatedMarketDemand)
    : 0;

  // Strategy state assignment
  const strategyState = assignStrategy(
    dominationScore,
    signals.momentumDirection,
    estimatedMarketDemand,
  );

  return {
    targetId: target.targetId,
    dominationScore,
    reviewDominance,
    contentDominance,
    pageStrength,
    conversionStrength,
    competitorSuppression,
    visibleMarketShare,
    capturedRevenueShare,
    strategyState,
    estimatedMarketDemand,
    contributingLocationIds: signals.contributingLocationIds,
    factors: {
      orgReviewCount: signals.orgReviewCount,
      competitorReviewCount: signals.competitorReviewCount,
      orgContentPageCount: signals.orgContentPageCount,
      competitorContentPageCount: signals.competitorContentPageCount,
      avgPageHealth: signals.avgPageHealth,
      avgConversionHealth: signals.avgConversionHealth,
      avgCompetitorGap: signals.avgCompetitorGap,
      momentumScore: signals.momentumScore,
      momentumDirection: signals.momentumDirection,
    },
  };
}

/**
 * Assign strategy state based on score, momentum, and demand.
 */
export function assignStrategy(
  score: number,
  momentumDirection?: MomentumDirection,
  estimatedDemand?: number,
): DominationStrategy {
  const t = DOMINATION_STRATEGY_THRESHOLDS;

  // Defend: score ≥ 80, momentum gaining or holding
  if (score >= t.defend.minScore && momentumDirection !== 'losing') {
    return 'defend';
  }

  // Expand: score 60–79, momentum gaining
  if (score >= t.expand.minScore && score <= t.expand.maxScore && momentumDirection === 'gaining') {
    return 'expand';
  }

  // Abandon: score < 40 AND low demand
  if (score <= t.abandon.maxScore && (estimatedDemand ?? 0) < MIN_DEMAND_THRESHOLD) {
    return 'abandon';
  }

  // Attack: score 40–79, momentum not losing, demand exists
  if (score >= t.attack.minScore && momentumDirection !== 'losing') {
    return 'attack';
  }

  // Default to attack if moderate score but losing momentum (recovery-attack)
  if (score >= t.attack.minScore) {
    return 'attack';
  }

  return 'abandon';
}

/**
 * Compute city-level momentum from per-target results.
 */
export function computeCityMomentum(
  results: Array<DominationScoreResult & { city: string; serviceCategory: string; momentumScore?: number; momentumDirection?: MomentumDirection }>,
): CityMomentumResult[] {
  const byCityMap = new Map<string, typeof results>();

  for (const r of results) {
    if (!byCityMap.has(r.city)) byCityMap.set(r.city, []);
    byCityMap.get(r.city)!.push(r);
  }

  const cityResults: CityMomentumResult[] = [];

  for (const [city, targets] of byCityMap) {
    // Revenue-weighted momentum
    const totalRevenue = targets.reduce((s, t) => s + (t.factors.orgReviewCount as number ?? 0), 0);
    let weightedMomentum = 0;

    for (const t of targets) {
      const weight = totalRevenue > 0 ? (t.factors.orgReviewCount as number ?? 0) / totalRevenue : 1 / targets.length;
      weightedMomentum += (t.momentumScore ?? 0) * weight;
    }

    const score = Math.round(weightedMomentum);
    const direction: MomentumDirection = score > 10 ? 'gaining' : score < -10 ? 'losing' : 'holding';

    // Top target = highest domination score
    const topTarget = targets.sort((a, b) => b.dominationScore - a.dominationScore)[0];

    cityResults.push({
      city,
      score,
      direction,
      targetCount: targets.length,
      topTarget: topTarget?.serviceCategory ?? '',
    });
  }

  return cityResults.sort((a, b) => b.score - a.score);
}

/**
 * Generate domination campaign suggestions for Attack/Expand targets.
 */
export function generateDominationCampaigns(
  results: Array<DominationScoreResult & { city: string; serviceCategory: string }>,
  locationHealthMap: Record<string, { weakDomains: string[] }>,
): DominationCampaignSuggestion[] {
  return results
    .filter(r => r.strategyState === 'attack' || r.strategyState === 'expand')
    .sort((a, b) => b.dominationScore - a.dominationScore)
    .map(r => {
      const estimatedOpportunity = r.estimatedMarketDemand * (1 - r.capturedRevenueShare);
      const suggestedDurationDays = r.strategyState === 'attack' ? 90 : 60;

      const locationTaskDistribution = r.contributingLocationIds.map(locId => ({
        locationId: locId,
        focusAreas: locationHealthMap[locId]?.weakDomains ?? ['review', 'content'],
      }));

      return {
        targetId: r.targetId,
        city: r.city,
        serviceCategory: r.serviceCategory,
        strategyState: r.strategyState,
        estimatedOpportunity: Math.round(estimatedOpportunity),
        suggestedDurationDays,
        locationTaskDistribution,
      };
    });
}

/**
 * Detect category stacking opportunities.
 * When a target reaches Defend state, suggest next target in same city.
 */
export function detectCategoryStacking(
  results: Array<DominationScoreResult & { city: string; serviceCategory: string }>,
): CategoryStackingSuggestion[] {
  const suggestions: CategoryStackingSuggestion[] = [];

  const defendTargets = results.filter(r => r.strategyState === 'defend');
  const nonDefendTargets = results.filter(r => r.strategyState !== 'defend' && r.strategyState !== 'abandon');

  for (const defended of defendTargets) {
    const sameCityTargets = nonDefendTargets
      .filter(r => r.city === defended.city)
      .sort((a, b) => b.dominationScore - a.dominationScore);

    if (sameCityTargets.length > 0) {
      const next = sameCityTargets[0];
      suggestions.push({
        completedTargetId: defended.targetId,
        nextTargetId: next.targetId,
        nextCity: next.city,
        nextServiceCategory: next.serviceCategory,
        nextScore: next.dominationScore,
        directive: `${defended.serviceCategory} dominance achieved. Next target: ${next.serviceCategory} (${next.city})`,
      });
    }
  }

  return suggestions;
}
