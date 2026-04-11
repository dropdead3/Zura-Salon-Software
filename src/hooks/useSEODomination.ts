import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeDominationScore,
  computeCityMomentum,
  generateDominationCampaigns,
  detectCategoryStacking,
  type DominationScoreResult,
  type CityMomentumResult,
  type DominationCampaignSuggestion,
  type CategoryStackingSuggestion,
} from '@/lib/seo-engine/seo-domination-engine';

interface DominationTarget {
  id: string;
  city: string;
  service_category: string;
  micro_market_keywords: string[];
  is_active: boolean;
}

interface DominationScoreRow {
  id: string;
  target_id: string;
  domination_score: number;
  review_dominance: number;
  content_dominance: number;
  page_strength: number;
  conversion_strength: number;
  competitor_suppression: number;
  visible_market_share: number;
  captured_revenue_share: number;
  strategy_state: string;
  contributing_location_ids: string[];
  estimated_market_demand: number;
  factors: Record<string, unknown>;
  scored_at: string;
}

export interface DominationData {
  targets: DominationTarget[];
  scores: Array<DominationScoreRow & { city: string; serviceCategory: string }>;
  cityMomentum: CityMomentumResult[];
  campaigns: DominationCampaignSuggestion[];
  stacking: CategoryStackingSuggestion[];
}

export function useSEODomination(organizationId: string | undefined): {
  data: DominationData | null;
  isLoading: boolean;
} {
  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ['seo-domination-targets', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_domination_targets' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .eq('is_active', true)
        .order('city', { ascending: true });
      if (error) throw error;
      return (data || []) as DominationTarget[];
    },
    enabled: !!organizationId,
  });

  const { data: scoreRows = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['seo-domination-scores', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_domination_scores' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('scored_at', { ascending: false });
      if (error) throw error;

      // Deduplicate: keep latest score per target
      const seen = new Set<string>();
      const latest: DominationScoreRow[] = [];
      for (const row of (data || []) as DominationScoreRow[]) {
        if (seen.has(row.target_id)) continue;
        seen.add(row.target_id);
        latest.push(row);
      }
      return latest;
    },
    enabled: !!organizationId,
  });

  const isLoading = targetsLoading || scoresLoading;

  const result = useMemo(() => {
    if (isLoading || !organizationId || targets.length === 0) return null;

    // Build target lookup
    const targetMap = new Map(targets.map(t => [t.id, t]));

    // Enrich scores with city/serviceCategory from target
    const enrichedScores = scoreRows
      .filter(s => targetMap.has(s.target_id))
      .map(s => {
        const t = targetMap.get(s.target_id)!;
        return {
          ...s,
          city: t.city,
          serviceCategory: t.service_category,
          momentumScore: (s.factors?.momentumScore as number) ?? 0,
          momentumDirection: (s.factors?.momentumDirection as 'gaining' | 'holding' | 'losing') ?? 'holding',
        };
      });

    // Compute city momentum from enriched scores
    const cityMomentum = computeCityMomentum(
      enrichedScores.map(s => ({
        ...s,
        targetId: s.target_id,
        dominationScore: s.domination_score,
        reviewDominance: s.review_dominance,
        contentDominance: s.content_dominance,
        pageStrength: s.page_strength,
        conversionStrength: s.conversion_strength,
        competitorSuppression: s.competitor_suppression,
        visibleMarketShare: s.visible_market_share,
        capturedRevenueShare: s.captured_revenue_share,
        strategyState: s.strategy_state as any,
        estimatedMarketDemand: s.estimated_market_demand,
        contributingLocationIds: s.contributing_location_ids,
        factors: s.factors,
      })),
    );

    // Generate campaign suggestions
    const campaigns = generateDominationCampaigns(
      enrichedScores.map(s => ({
        targetId: s.target_id,
        dominationScore: s.domination_score,
        reviewDominance: s.review_dominance,
        contentDominance: s.content_dominance,
        pageStrength: s.page_strength,
        conversionStrength: s.conversion_strength,
        competitorSuppression: s.competitor_suppression,
        visibleMarketShare: s.visible_market_share,
        capturedRevenueShare: s.captured_revenue_share,
        strategyState: s.strategy_state as any,
        estimatedMarketDemand: s.estimated_market_demand,
        contributingLocationIds: s.contributing_location_ids,
        factors: s.factors,
        city: s.city,
        serviceCategory: s.serviceCategory,
      })),
      {},
    );

    // Detect stacking
    const stacking = detectCategoryStacking(
      enrichedScores.map(s => ({
        targetId: s.target_id,
        dominationScore: s.domination_score,
        reviewDominance: s.review_dominance,
        contentDominance: s.content_dominance,
        pageStrength: s.page_strength,
        conversionStrength: s.conversion_strength,
        competitorSuppression: s.competitor_suppression,
        visibleMarketShare: s.visible_market_share,
        capturedRevenueShare: s.captured_revenue_share,
        strategyState: s.strategy_state as any,
        estimatedMarketDemand: s.estimated_market_demand,
        contributingLocationIds: s.contributing_location_ids,
        factors: s.factors,
        city: s.city,
        serviceCategory: s.serviceCategory,
      })),
    );

    return {
      targets,
      scores: enrichedScores,
      cityMomentum,
      campaigns,
      stacking,
    };
  }, [isLoading, organizationId, targets, scoreRows]);

  return { data: result, isLoading };
}
