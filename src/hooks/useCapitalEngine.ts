import { useMemo } from 'react';
import { useSalonPerformanceIndex, useExpansionOpportunities } from '@/hooks/useExpansionOpportunities';
import { rankOpportunities, computeROE, type QueuedOpportunity } from '@/lib/capital-engine/capital-engine';
import { getSPITier } from '@/config/capital-engine/capital-config';

export function useCapitalEngine() {
  const { data: spiScores = [], isLoading: spiLoading } = useSalonPerformanceIndex();
  const { data: opportunities = [], isLoading: oppLoading } = useExpansionOpportunities();

  const locationSPIs = useMemo(() => {
    return spiScores.map((s: any) => ({
      locationId: s.location_id,
      spiScore: Number(s.spi_score),
      revenueEfficiency: Number(s.revenue_efficiency),
      growthVelocity: Number(s.growth_velocity),
      conversionStrength: Number(s.conversion_strength),
      pricingPower: Number(s.pricing_power),
      operationalStability: Number(s.operational_stability),
      executionQuality: Number(s.execution_quality),
      riskLevel: s.risk_level,
      factors: s.factors,
      tier: getSPITier(Number(s.spi_score)),
      scoredAt: s.scored_at,
    }));
  }, [spiScores]);

  const capitalQueue = useMemo(() => {
    const queued: QueuedOpportunity[] = (opportunities as any[])
      .filter((o) => o.status !== 'dismissed' && o.status !== 'completed')
      .map((o) => {
        const roeResult = computeROE({
          capitalRequired: Number(o.capital_required),
          predictedAnnualLift: Number(o.predicted_annual_lift),
          confidence: o.confidence as 'high' | 'medium' | 'low',
        });

        return {
          id: o.id,
          title: o.title,
          roe: roeResult.roe,
          capitalRequired: Number(o.capital_required),
          predictedAnnualLift: Number(o.predicted_annual_lift),
          breakEvenMonths: roeResult.adjustedBreakEvenMonths,
          confidence: o.confidence,
          riskLevel: (o.risk_factors as any)?.level ?? 'moderate',
          opportunityType: o.opportunity_type,
          locationId: o.location_id,
          city: o.city,
        };
      });

    return rankOpportunities(queued);
  }, [opportunities]);

  const topOpportunity = capitalQueue[0] ?? null;

  return {
    locationSPIs,
    capitalQueue,
    topOpportunity,
    isLoading: spiLoading || oppLoading,
  };
}
