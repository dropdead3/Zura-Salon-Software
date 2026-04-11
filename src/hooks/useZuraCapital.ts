import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { isZuraEligible, type ZuraOpportunity, type ZuraOrgContext } from '@/lib/capital-engine/zura-eligibility-engine';
import { computeSurfacePriority, type PriorityContext } from '@/lib/capital-engine/surface-priority-engine';

export interface ZuraCapitalOpportunity {
  id: string;
  title: string;
  summary: string;
  opportunityType: string;
  constraintType: string | null;
  investmentCents: number;
  predictedLiftExpectedCents: number;
  predictedLiftLowCents: number;
  predictedLiftHighCents: number;
  breakEvenMonthsExpected: number;
  breakEvenMonthsLow: number;
  breakEvenMonthsHigh: number;
  roe: number;
  confidenceScore: number;
  riskLevel: string;
  momentumScore: number | null;
  businessValueScore: number | null;
  effortScore: number | null;
  eligibilityStatus: string;
  status: string;
  stripeOfferAvailable: boolean;
  providerOfferAmountCents: number | null;
  providerOfferTermMonths: number | null;
  providerEstimatedPaymentCents: number | null;
  providerFeesSummary: string | null;
  coverageRatio: number | null;
  netMonthlyGainCents: number | null;
  recommendedActionLabel: string;
  locationId: string | null;
  serviceId: string | null;
  stylistId: string | null;
  campaignId: string | null;
  createdAt: string;
  expiresAt: string | null;
  surfacePriority: number;
  zuraEligible: boolean;
  zuraReasons: string[];
}

export function useZuraCapital() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Fetch from production capital_funding_opportunities
  const { data: rawOpps = [], isLoading: oppLoading } = useQuery({
    queryKey: ['zura-capital-opportunities', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capital_funding_opportunities')
        .select('*')
        .eq('organization_id', orgId!)
        .not('status', 'in', '("canceled","expired")')
        .order('surface_priority', { ascending: false });
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
        .from('capital_funding_projects')
        .select('*')
        .eq('organization_id', orgId!)
        .in('status', ['active', 'on_track', 'above_forecast', 'below_forecast', 'at_risk']);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Build org context
  const orgContext = useMemo<ZuraOrgContext>(() => {
    const locationExposure: Record<string, number> = {};
    const stylistExposure: Record<string, number> = {};

    // Build exposure from funded projects + opportunities
    (fundedProjects as any[]).forEach((fp) => {
      // TODO: join with opportunity for location_id if needed
    });

    return {
      activeFundedProjectCount: fundedProjects.length,
      hasUnderperformingProject: (fundedProjects as any[]).some(
        (fp) => fp.status === 'at_risk' || (fp.variance_percent != null && Number(fp.variance_percent) <= -25),
      ),
      hasCriticalOperationalAlerts: false,
      locationExposure,
      stylistExposure,
      lastDeclinedAt: null,
      lastUnderperformingAt: null,
    };
  }, [fundedProjects]);

  const priorityContext = useMemo<PriorityContext>(() => ({
    activeProjectCount: fundedProjects.length,
    recentDismissals: 0,
    recentDeclines: 0,
  }), [fundedProjects]);

  // Map and score opportunities
  const opportunities = useMemo<ZuraCapitalOpportunity[]>(() => {
    return (rawOpps as any[])
      .filter((o) => o.status !== 'completed')
      .map((o) => {
        const zuraOpp: ZuraOpportunity = {
          id: o.id,
          roe_score: Number(o.roe_score),
          confidence: o.confidence_score >= 80 ? 'high' : o.confidence_score >= 60 ? 'medium' : 'low',
          risk_level: o.risk_level,
          capital_required: o.required_investment_cents / 100,
          momentum_score: o.momentum_score,
          constraint_type: o.constraint_type,
          eligibility_status: o.eligibility_status,
          created_at: o.created_at,
          expires_at: o.expires_at,
          location_id: o.location_id,
          stylist_id: o.stylist_id,
        };

        const eligibility = isZuraEligible(zuraOpp, orgContext);

        const priority = computeSurfacePriority(
          {
            id: o.id,
            roe_score: Number(o.roe_score),
            confidence_score: Number(o.confidence_score),
            business_value_score: o.business_value_score,
            momentum_score: o.momentum_score,
            effort_score: o.effort_score,
            opportunity_type: o.opportunity_type,
            risk_level: o.risk_level,
            constraint_type: o.constraint_type,
            status: o.status,
            eligibility_status: o.eligibility_status,
            detected_at: o.detected_at,
            expires_at: o.expires_at,
            location_id: o.location_id,
            service_id: o.service_id,
            stylist_id: o.stylist_id,
          },
          priorityContext,
        );

        return {
          id: o.id,
          title: o.title,
          summary: o.summary || '',
          opportunityType: o.opportunity_type,
          constraintType: o.constraint_type,
          investmentCents: Number(o.required_investment_cents),
          predictedLiftExpectedCents: Number(o.predicted_revenue_lift_expected_cents),
          predictedLiftLowCents: Number(o.predicted_revenue_lift_low_cents),
          predictedLiftHighCents: Number(o.predicted_revenue_lift_high_cents),
          breakEvenMonthsExpected: Number(o.break_even_months_expected),
          breakEvenMonthsLow: Number(o.break_even_months_low),
          breakEvenMonthsHigh: Number(o.break_even_months_high),
          roe: Number(o.roe_score),
          confidenceScore: Number(o.confidence_score),
          riskLevel: o.risk_level,
          momentumScore: o.momentum_score != null ? Number(o.momentum_score) : null,
          businessValueScore: o.business_value_score != null ? Number(o.business_value_score) : null,
          effortScore: o.effort_score != null ? Number(o.effort_score) : null,
          eligibilityStatus: o.eligibility_status,
          status: o.status,
          stripeOfferAvailable: o.stripe_offer_available,
          providerOfferAmountCents: o.provider_offer_amount_cents,
          providerOfferTermMonths: o.provider_offer_term_months,
          providerEstimatedPaymentCents: o.provider_estimated_payment_cents,
          providerFeesSummary: o.provider_fees_summary,
          coverageRatio: o.coverage_ratio ? Number(o.coverage_ratio) : null,
          netMonthlyGainCents: o.net_monthly_gain_expected_cents,
          recommendedActionLabel: o.recommended_action_label,
          locationId: o.location_id,
          serviceId: o.service_id,
          stylistId: o.stylist_id,
          campaignId: o.campaign_id,
          createdAt: o.created_at,
          expiresAt: o.expires_at,
          surfacePriority: priority,
          zuraEligible: eligibility.eligible,
          zuraReasons: eligibility.reasons,
        };
      })
      .sort((a, b) => b.surfacePriority - a.surfacePriority);
  }, [rawOpps, orgContext, priorityContext]);

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
