import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { isZuraEligible, type ZuraOpportunity, type ZuraOrgContext } from '@/lib/capital-engine/zura-eligibility-engine';
import { computeROE } from '@/lib/capital-engine/capital-engine';

export interface ZuraCapitalOpportunity {
  id: string;
  title: string;
  summary: string | null;
  opportunityType: string;
  constraintType: string | null;
  capitalRequired: number;
  predictedAnnualLift: number;
  predictedRevenueLiftLow: number | null;
  predictedRevenueLiftHigh: number | null;
  breakEvenMonths: number;
  breakEvenMonthsLow: number | null;
  breakEvenMonthsHigh: number | null;
  roe: number;
  confidence: string;
  riskLevel: string;
  momentumScore: number | null;
  businessValueScore: number | null;
  effortScore: number | null;
  eligibilityStatus: string;
  stripeOfferAvailable: boolean;
  stripeOfferAmount: number | null;
  stripeOfferTermsSummary: string | null;
  recommendedActionLabel: string;
  locationId: string | null;
  city: string | null;
  serviceId: string | null;
  campaignId: string | null;
  createdAt: string;
  expiresAt: string | null;
  zuraEligible: boolean;
  zuraReasons: string[];
}

export function useZuraCapital() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Fetch opportunities
  const { data: rawOpportunities = [], isLoading: oppLoading } = useQuery({
    queryKey: ['zura-capital-opportunities', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expansion_opportunities')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('roe_score', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch active funded projects for org context
  const { data: fundedProjects = [], isLoading: fundedLoading } = useQuery({
    queryKey: ['zura-capital-funded', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financed_projects')
        .select('*, expansion_opportunities(location_id)')
        .eq('organization_id', orgId!)
        .in('status', ['active', 'pending_payment']);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Build org context
  const orgContext = useMemo<ZuraOrgContext>(() => {
    const locationExposure: Record<string, number> = {};
    const stylistExposure: Record<string, number> = {};

    (fundedProjects as any[]).forEach((fp) => {
      const locId = (fp as any).expansion_opportunities?.location_id;
      if (locId) {
        locationExposure[locId] = (locationExposure[locId] ?? 0) + Number(fp.funded_amount ?? 0);
      }
    });

    return {
      activeFundedProjectCount: fundedProjects.length,
      hasUnderperformingProject: (fundedProjects as any[]).some(
        (fp) => fp.status === 'active' && Number(fp.roi_to_date ?? 0) < -25,
      ),
      hasCriticalOperationalAlerts: false, // TODO: integrate with operational alerts
      locationExposure,
      stylistExposure,
      lastDeclinedAt: null, // TODO: query capital_event_log for last declined
      lastUnderperformingAt: null,
    };
  }, [fundedProjects]);

  // Compute eligibility and map opportunities
  const opportunities = useMemo<ZuraCapitalOpportunity[]>(() => {
    return (rawOpportunities as any[])
      .filter((o) => o.status !== 'dismissed' && o.status !== 'completed' && o.status !== 'canceled')
      .map((o) => {
        const roeResult = computeROE({
          capitalRequired: Number(o.capital_required),
          predictedAnnualLift: Number(o.predicted_annual_lift),
          confidence: (o.confidence as 'high' | 'medium' | 'low') ?? 'medium',
        });

        const zuraOpp: ZuraOpportunity = {
          id: o.id,
          roe_score: roeResult.roe,
          confidence: o.confidence ?? 'medium',
          risk_level: (o.risk_factors as any)?.level ?? 'moderate',
          capital_required: Number(o.capital_required),
          momentum_score: o.momentum_score != null ? Number(o.momentum_score) : null,
          constraint_type: o.constraint_type,
          eligibility_status: o.eligibility_status ?? 'detected',
          created_at: o.created_at,
          expires_at: o.expires_at,
          location_id: o.location_id,
        };

        const eligibility = isZuraEligible(zuraOpp, orgContext);

        return {
          id: o.id,
          title: o.title,
          summary: o.summary,
          opportunityType: o.opportunity_type,
          constraintType: o.constraint_type,
          capitalRequired: Number(o.capital_required),
          predictedAnnualLift: Number(o.predicted_annual_lift),
          predictedRevenueLiftLow: o.predicted_revenue_lift_low ? Number(o.predicted_revenue_lift_low) : null,
          predictedRevenueLiftHigh: o.predicted_revenue_lift_high ? Number(o.predicted_revenue_lift_high) : null,
          breakEvenMonths: roeResult.adjustedBreakEvenMonths,
          breakEvenMonthsLow: o.break_even_months_low ? Number(o.break_even_months_low) : null,
          breakEvenMonthsHigh: o.break_even_months_high ? Number(o.break_even_months_high) : null,
          roe: roeResult.roe,
          confidence: o.confidence ?? 'medium',
          riskLevel: (o.risk_factors as any)?.level ?? 'moderate',
          momentumScore: o.momentum_score != null ? Number(o.momentum_score) : null,
          businessValueScore: o.business_value_score != null ? Number(o.business_value_score) : null,
          effortScore: o.effort_score != null ? Number(o.effort_score) : null,
          eligibilityStatus: o.eligibility_status ?? 'detected',
          stripeOfferAvailable: o.stripe_offer_available ?? false,
          stripeOfferAmount: o.stripe_offer_amount ? Number(o.stripe_offer_amount) : null,
          stripeOfferTermsSummary: o.stripe_offer_terms_summary,
          recommendedActionLabel: o.recommended_action_label ?? 'Fund This',
          locationId: o.location_id,
          city: o.city,
          serviceId: o.service_id,
          campaignId: o.campaign_id,
          createdAt: o.created_at,
          expiresAt: o.expires_at,
          zuraEligible: eligibility.eligible,
          zuraReasons: eligibility.reasons,
        };
      })
      .sort((a, b) => b.roe - a.roe);
  }, [rawOpportunities, orgContext]);

  const eligibleOpportunities = opportunities.filter((o) => o.zuraEligible);
  const topOpportunity = eligibleOpportunities[0] ?? null;

  return {
    opportunities,
    eligibleOpportunities,
    topOpportunity,
    activeProjectCount: fundedProjects.length,
    isLoading: oppLoading || fundedLoading,
  };
}
