import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCapitalPolicySettings } from '@/hooks/useCapitalPolicySettings';
import {
  calculateInternalEligibility,
  calculateSurfacePriority,
  calculateRoeRatio,
  calculateRoeScore,
  calculateBreakEvenScore,
  calculateFreshnessScore,
  calculateOpportunityFreshnessDays,
  calculateNetMonthlyGainCents,
  calculateNetImpactScore,
  calculateCoverageRatio,
  type EligibilityInputs,
} from '@/lib/capital-engine/capital-formulas';
import { DEFAULT_CAPITAL_POLICY, type CapitalPolicy } from '@/config/capital-engine/capital-formulas-config';

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

/** Map org policy settings row to CapitalPolicy override */
type MutableCapitalPolicy = {
  roeThreshold: number;
  confidenceThreshold: number;
  maxRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  minOperationalStability: number;
  minExecutionReadiness: number;
  maxConcurrentProjects: number;
  cooldownAfterDeclineDays: number;
  cooldownAfterUnderperformanceDays: number;
  staleDays: number;
  stylistSpiThreshold: number;
  stylistOrsThreshold: number;
  maxExposurePerLocation: number;
  maxExposurePerStylist: number;
  minCapitalRequired: number;
  allowManagerInitiation: boolean;
  allowStylistMicrofunding: boolean;
};

/** Map org policy settings row to a mutable policy object merged with defaults */
function buildEffectivePolicy(settings: Record<string, any> | null | undefined): MutableCapitalPolicy {
  const base: MutableCapitalPolicy = { ...DEFAULT_CAPITAL_POLICY };
  if (!settings) return base;

  if (settings.roe_threshold != null) base.roeThreshold = Number(settings.roe_threshold);
  if (settings.confidence_threshold != null) base.confidenceThreshold = Number(settings.confidence_threshold);
  if (settings.max_risk_level != null) base.maxRiskLevel = settings.max_risk_level;
  if (settings.min_operational_stability != null) base.minOperationalStability = Number(settings.min_operational_stability);
  if (settings.min_execution_readiness != null) base.minExecutionReadiness = Number(settings.min_execution_readiness);
  if (settings.max_concurrent_projects != null) base.maxConcurrentProjects = Number(settings.max_concurrent_projects);
  if (settings.cooldown_after_decline_days != null) base.cooldownAfterDeclineDays = Number(settings.cooldown_after_decline_days);
  if (settings.cooldown_after_underperformance_days != null) base.cooldownAfterUnderperformanceDays = Number(settings.cooldown_after_underperformance_days);
  if (settings.stale_days != null) base.staleDays = Number(settings.stale_days);
  if (settings.max_exposure_per_location != null) base.maxExposurePerLocation = Number(settings.max_exposure_per_location);
  if (settings.max_exposure_per_stylist != null) base.maxExposurePerStylist = Number(settings.max_exposure_per_stylist);
  if (settings.min_capital_required != null) base.minCapitalRequired = Number(settings.min_capital_required);
  if (settings.allow_manager_initiation != null) base.allowManagerInitiation = Boolean(settings.allow_manager_initiation);
  if (settings.allow_stylist_microfunding != null) base.allowStylistMicrofunding = Boolean(settings.allow_stylist_microfunding);
  return base;
}

export function useZuraCapital() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Org policy settings
  const { data: policySettings } = useCapitalPolicySettings();

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

  // Fetch active funded projects for org context (join opportunity for location/stylist)
  const { data: fundedProjects = [], isLoading: fundedLoading } = useQuery({
    queryKey: ['zura-capital-funded', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capital_funding_projects')
        .select('*, capital_funding_opportunities(location_id, stylist_id)')
        .eq('organization_id', orgId!)
        .in('status', ['active', 'on_track', 'above_forecast', 'below_forecast', 'at_risk']);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch recent dismissals from surface state
  const { data: surfaceStates = [] } = useQuery({
    queryKey: ['zura-capital-surface-state', orgId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from('capital_surface_state')
        .select('*')
        .eq('organization_id', orgId!)
        .gte('dismissed_at', thirtyDaysAgo.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch recent declines and underperformance from event log
  const { data: recentEvents = [] } = useQuery({
    queryKey: ['zura-capital-recent-events', orgId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from('capital_event_log')
        .select('event_type, created_at')
        .eq('organization_id', orgId!)
        .in('event_type', ['funding_declined', 'status_changed'])
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Derived context values
  const { locationExposure, stylistExposure, lastUnderperformingAt } = useMemo(() => {
    const locExp: Record<string, number> = {};
    const styExp: Record<string, number> = {};
    let lastUnderperf: string | null = null;

    (fundedProjects as any[]).forEach((fp) => {
      const fundedAmount = Number(fp.funded_amount_cents ?? 0) / 100;
      const opp = fp.capital_funding_opportunities;
      if (opp?.location_id) {
        locExp[opp.location_id] = (locExp[opp.location_id] ?? 0) + fundedAmount;
      }
      if (opp?.stylist_id) {
        styExp[opp.stylist_id] = (styExp[opp.stylist_id] ?? 0) + fundedAmount;
      }
      // Track most recent at_risk project
      if (fp.status === 'at_risk' && fp.updated_at) {
        if (!lastUnderperf || fp.updated_at > lastUnderperf) {
          lastUnderperf = fp.updated_at;
        }
      }
    });

    return { locationExposure: locExp, stylistExposure: styExp, lastUnderperformingAt: lastUnderperf };
  }, [fundedProjects]);

  const { recentDismissals, recentDeclines, lastDeclinedAt } = useMemo(() => {
    const dismissals = surfaceStates.length;
    const declineEvents = (recentEvents as any[]).filter(e => e.event_type === 'funding_declined');
    return {
      recentDismissals: dismissals,
      recentDeclines: declineEvents.length,
      lastDeclinedAt: declineEvents[0]?.created_at ?? null,
    };
  }, [surfaceStates, recentEvents]);

  // Build effective policy: defaults merged with org overrides
  const effectivePolicy = useMemo(() => {
    return buildEffectivePolicy(policySettings);
  }, [policySettings]);

  // Map and score opportunities using canonical formulas
  const opportunities = useMemo<ZuraCapitalOpportunity[]>(() => {
    const activeProjectCount = fundedProjects.length;
    const hasUnderperforming = (fundedProjects as any[]).some(
      (fp) => fp.status === 'at_risk' || (fp.variance_percent != null && Number(fp.variance_percent) <= -25),
    );
    const underperformingCount = (fundedProjects as any[]).filter(
      (fp) => fp.status === 'at_risk',
    ).length;
    const repaymentDistress = (fundedProjects as any[]).some(
      (fp) => fp.repayment_status === 'delinquent',
    );

    return (rawOpps as any[])
      .filter((o) => o.status !== 'completed')
      .map((o) => {
        const investmentCents = Number(o.required_investment_cents);
        const liftCents = Number(o.predicted_revenue_lift_expected_cents);
        const breakEvenMonths = Number(o.break_even_months_expected);
        const confidenceScore = Number(o.confidence_score);
        const momentumScore = o.momentum_score != null ? Number(o.momentum_score) : 50;
        const businessValueScore = o.business_value_score != null ? Number(o.business_value_score) : 50;
        const operationalStability = o.operational_stability_score != null ? Number(o.operational_stability_score) : 70;
        const executionReadiness = o.execution_readiness_score != null ? Number(o.execution_readiness_score) : 70;
        const freshnessDays = calculateOpportunityFreshnessDays(o.detected_at || o.created_at);
        const roeRatio = calculateRoeRatio(liftCents, investmentCents);

        // Canonical eligibility with org policy
        const eligInputs: EligibilityInputs = {
          roeRatio,
          confidenceScore,
          riskLevel: o.risk_level,
          operationalStabilityScore: operationalStability,
          executionReadinessScore: executionReadiness,
          activeCapitalProjectsCount: activeProjectCount,
          activeUnderperformingProjectsCount: underperformingCount,
          repaymentDistressFlag: repaymentDistress,
          opportunityFreshnessDays: freshnessDays,
          requiredInvestmentCents: investmentCents,
          constraintType: o.constraint_type,
          momentumScore: o.momentum_score != null ? Number(o.momentum_score) : null,
          hasCriticalOpsAlerts: false, // TODO: wire to operational alerting system when available
          expiresAt: o.expires_at,
          locationId: o.location_id,
          locationExposure: o.location_id ? (locationExposure[o.location_id] ?? 0) : 0,
          stylistId: o.stylist_id,
          stylistExposure: o.stylist_id ? (stylistExposure[o.stylist_id] ?? 0) : 0,
          lastDeclinedAt,
          lastUnderperformingAt,
        };
        const eligibility = calculateInternalEligibility(eligInputs, effectivePolicy);

        // Canonical surface priority
        const roeScore = calculateRoeScore(roeRatio);
        const breakEvenScore = calculateBreakEvenScore(breakEvenMonths);
        const paymentCents = o.provider_estimated_payment_cents ? Number(o.provider_estimated_payment_cents) : 0;
        const netGainCents = calculateNetMonthlyGainCents(liftCents, paymentCents, breakEvenMonths);
        const netImpactScore = calculateNetImpactScore(netGainCents, investmentCents);
        const coverage = calculateCoverageRatio(o.provider_offer_amount_cents, investmentCents);

        // Per-opportunity dismissal count on any surface
        const oppDismissals = (surfaceStates as any[]).filter(
          s => s.funding_opportunity_id === o.id,
        ).length;

        const priority = calculateSurfacePriority(
          {
            roeScore,
            confidenceScore,
            businessValueScore,
            breakEvenScore,
            momentumScore,
            constraintType: o.constraint_type,
            netImpactScore,
          },
          {
            freshnessDays,
            recentDismissCount: oppDismissals,
            coverageRatio: coverage.ratio,
            activeProjectCount,
          },
        );

        return {
          id: o.id,
          title: o.title,
          summary: o.summary || '',
          opportunityType: o.opportunity_type,
          constraintType: o.constraint_type,
          investmentCents,
          predictedLiftExpectedCents: liftCents,
          predictedLiftLowCents: Number(o.predicted_revenue_lift_low_cents),
          predictedLiftHighCents: Number(o.predicted_revenue_lift_high_cents),
          breakEvenMonthsExpected: breakEvenMonths,
          breakEvenMonthsLow: Number(o.break_even_months_low),
          breakEvenMonthsHigh: Number(o.break_even_months_high),
          roe: Number(o.roe_score),
          confidenceScore,
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
          zuraReasons: eligibility.reasonSummaries,
        };
      })
      .sort((a, b) => b.surfacePriority - a.surfacePriority);
  }, [rawOpps, fundedProjects, locationExposure, stylistExposure, lastDeclinedAt, lastUnderperformingAt, surfaceStates, effectivePolicy]);

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
