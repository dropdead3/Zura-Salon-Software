import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateInternalEligibility,
  calculateOperationalReadiness,
  calculateOpportunityRanking,
  calculateOpportunityFreshnessDays,
  type EligibilityInputs,
  type EligibilityResult,
  type OperationalReadinessResult,
  type OpportunityRankingResult,
} from '@/lib/capital-engine/capital-formulas';
import { DEFAULT_CAPITAL_POLICY, type CapitalPolicy } from '@/config/capital-engine/capital-formulas-config';

const QUALIFYING_STATUSES = ['eligible_internal', 'eligible_provider', 'surfaced', 'viewed'] as const;
const EXCLUDED_STATUSES = ['canceled', 'expired'] as const;

export interface OpportunityDiagnostic {
  id: string;
  title: string;
  status: string;
  isQualifying: boolean;
  eligibility: EligibilityResult;
  operationalReadiness: OperationalReadinessResult;
  ranking: OpportunityRankingResult;
  inputs: EligibilityInputs;
  policy: CapitalPolicy;
  createdAt: string;
  isStripeOffer: boolean;
}

export interface ActiveProjectSummary {
  id: string;
  title: string;
  status: string;
  fundedAmount: number;
  repaymentStatus: string | null;
}

export interface OrgCapitalDiagnostics {
  flagEnabled: boolean;
  hasActiveStripeConnect: boolean;
  connectedLocationCount: number;
  totalLocationCount: number;
  phorestConnectedLocationCount: number;
  usesThirdPartyPOS: boolean;
  totalOpportunities: number;
  qualifyingCount: number;
  sidebarVisible: boolean;
  opportunities: OpportunityDiagnostic[];
  lastOpportunityAt: string | null;
  effectivePolicy: CapitalPolicy;
  criticalOpsAlertCount: number;
  repaymentDistress: boolean;
  distressedProjectNames: string[];
  activeProjectCount: number;
  activeProjectSummaries: ActiveProjectSummary[];
}

export type VisibilityVerdict = 'surfacing' | 'enabled_not_surfacing' | 'disabled';

export function getVisibilityVerdict(
  capitalEnabled: boolean,
  qualifyingCount: number,
): VisibilityVerdict {
  if (!capitalEnabled) return 'disabled';
  if (qualifyingCount > 0) return 'surfacing';
  return 'enabled_not_surfacing';
}

export function useOrgCapitalDiagnostics(orgId: string | null) {
  return useQuery({
    queryKey: ['org-capital-diagnostics', orgId],
    queryFn: async (): Promise<OrgCapitalDiagnostics> => {
      // 1. Check flag
      const { data: flagData } = await supabase
        .from('organization_feature_flags')
        .select('is_enabled')
        .eq('organization_id', orgId!)
        .eq('flag_key', 'capital_enabled')
        .maybeSingle();

      const flagEnabled = flagData?.is_enabled ?? false;

      // 1b. Check Zura Pay (Stripe Connect) status + Phorest connections
      const { data: allLocations } = await supabase
        .from('locations')
        .select('id, stripe_account_id, stripe_status, phorest_branch_id')
        .eq('organization_id', orgId!);

      const totalLocationCount = allLocations?.length ?? 0;
      const connectedLocations = (allLocations ?? []).filter(
        (l) => l.stripe_account_id && l.stripe_status === 'active',
      );
      const connectedLocationCount = connectedLocations.length;
      const hasActiveStripeConnect = connectedLocationCount > 0;
      const phorestConnectedLocationCount = (allLocations ?? []).filter(
        (l) => l.phorest_branch_id,
      ).length;
      const usesThirdPartyPOS = phorestConnectedLocationCount > 0 && !hasActiveStripeConnect;

      // 2. Load org-specific policy (G11)
      const { data: orgPolicy } = await supabase
        .from('capital_policy_settings')
        .select('*')
        .eq('organization_id', orgId!)
        .maybeSingle();

      let effectivePolicy: CapitalPolicy = { ...DEFAULT_CAPITAL_POLICY };
      const policySource = orgPolicy;
      if (policySource) {
        effectivePolicy = {
          ...effectivePolicy,
          roeThreshold: policySource.roe_threshold ?? effectivePolicy.roeThreshold,
          confidenceThreshold: policySource.confidence_threshold ?? effectivePolicy.confidenceThreshold,
          maxConcurrentProjects: policySource.max_concurrent_projects ?? effectivePolicy.maxConcurrentProjects,
          maxRiskLevel: (policySource.max_risk_level as any) ?? effectivePolicy.maxRiskLevel,
          cooldownAfterDeclineDays: policySource.cooldown_after_decline_days ?? effectivePolicy.cooldownAfterDeclineDays,
          cooldownAfterUnderperformanceDays: policySource.cooldown_after_underperformance_days ?? effectivePolicy.cooldownAfterUnderperformanceDays,
          allowManagerInitiation: policySource.allow_manager_initiation ?? effectivePolicy.allowManagerInitiation,
        };
      }

      // 3. Get real project context (N4) + exposure data (B4)
      const { data: activeProjects } = await supabase
        .from('capital_funding_projects')
        .select('id, status, repayment_status, funded_amount_cents, updated_at, capital_funding_opportunities(title, location_id, stylist_id)')
        .eq('organization_id', orgId!)
        .in('status', ['active', 'on_track', 'above_forecast', 'below_forecast', 'at_risk']);

      const activeProjectCount = activeProjects?.length ?? 0;
      const underperformingCount = (activeProjects ?? []).filter(p => p.status === 'at_risk').length;
      const repaymentDistress = (activeProjects ?? []).some(p => p.repayment_status === 'delinquent');
      const distressedProjectNames = (activeProjects ?? [])
        .filter(p => p.repayment_status === 'delinquent')
        .map(p => (p.capital_funding_opportunities as any)?.title ?? 'Untitled');
      const activeProjectSummaries: ActiveProjectSummary[] = (activeProjects ?? []).map(p => ({
        id: p.id,
        title: (p.capital_funding_opportunities as any)?.title ?? 'Untitled',
        status: p.status,
        fundedAmount: Number(p.funded_amount_cents ?? 0) / 100,
        repaymentStatus: p.repayment_status,
      }));

      // Derive lastUnderperformingAt from at_risk projects
      let lastUnderperformingAt: string | null = null;
      for (const proj of activeProjects ?? []) {
        if (proj.status === 'at_risk' && proj.updated_at) {
          if (!lastUnderperformingAt || proj.updated_at > lastUnderperformingAt) {
            lastUnderperformingAt = proj.updated_at;
          }
        }
      }

      // Derive lastDeclinedAt from capital_event_log
      const { data: declineEvents } = await supabase
        .from('capital_event_log')
        .select('created_at')
        .eq('organization_id', orgId!)
        .eq('event_type', 'funding_declined')
        .order('created_at', { ascending: false })
        .limit(1);
      const lastDeclinedAt = declineEvents?.[0]?.created_at ?? null;

      // TODO: Wire hasCriticalOpsAlerts to operational alerting system
      // Currently no alerting table exists — defaulting to false with warning
      const hasCriticalOpsAlerts = false;
      if (hasCriticalOpsAlerts === false) {
        console.warn('[Capital Diagnostics] hasCriticalOpsAlerts is hardcoded to false — wire to alerting system when available');
      }

      // Compute per-location and per-stylist exposure from active projects
      const locationExposureMap = new Map<string, number>();
      const stylistExposureMap = new Map<string, number>();
      for (const proj of activeProjects ?? []) {
        const fundedCents = Number(proj.funded_amount_cents ?? 0);
        const opp = proj.capital_funding_opportunities as any;
        if (opp?.location_id) {
          locationExposureMap.set(opp.location_id, (locationExposureMap.get(opp.location_id) ?? 0) + fundedCents / 100);
        }
        if (opp?.stylist_id) {
          stylistExposureMap.set(opp.stylist_id, (stylistExposureMap.get(opp.stylist_id) ?? 0) + fundedCents / 100);
        }
      }

      // 4. Get all non-canceled/expired opportunities
      const { data: opps, error } = await supabase
        .from('capital_funding_opportunities')
        .select('*')
        .eq('organization_id', orgId!)
        .not('status', 'in', `(${EXCLUDED_STATUSES.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const opportunities: OpportunityDiagnostic[] = (opps || []).map((opp) => {
        const isQualifying = QUALIFYING_STATUSES.includes(opp.status as any);

        const inputs: EligibilityInputs = {
          roeRatio: opp.roe_score ?? 0,
          confidenceScore: opp.confidence_score ?? 0,
          riskLevel: opp.risk_level ?? 'critical',
          operationalStabilityScore: opp.operational_stability_score ?? 0,
          executionReadinessScore: opp.effort_score ?? 0,
          activeCapitalProjectsCount: activeProjectCount,
          activeUnderperformingProjectsCount: underperformingCount,
          repaymentDistressFlag: repaymentDistress,
          opportunityFreshnessDays: calculateOpportunityFreshnessDays(opp.created_at),
          requiredInvestmentCents: opp.required_investment_cents ?? 0,
          constraintType: opp.constraint_type ?? null,
          momentumScore: opp.momentum_score ?? null,
          hasCriticalOpsAlerts,
          expiresAt: opp.expires_at ?? null,
          locationId: opp.location_id ?? null,
          locationExposure: opp.location_id ? (locationExposureMap.get(opp.location_id) ?? 0) : 0,
          stylistId: opp.stylist_id ?? null,
          stylistExposure: opp.stylist_id ? (stylistExposureMap.get(opp.stylist_id) ?? 0) : 0,
          lastDeclinedAt,
          lastUnderperformingAt,
        };

        const eligibility = calculateInternalEligibility(inputs, effectivePolicy);
        const operationalReadiness = calculateOperationalReadiness(inputs, effectivePolicy);
        const ranking = calculateOpportunityRanking(inputs, effectivePolicy);

        return {
          id: opp.id,
          title: opp.title ?? opp.opportunity_type ?? 'Untitled',
          status: opp.status,
          isQualifying,
          eligibility,
          operationalReadiness,
          ranking,
          inputs,
          policy: effectivePolicy,
          createdAt: opp.created_at,
          isStripeOffer: opp.opportunity_type === 'stripe_capital' || opp.stripe_offer_available === true,
        };
      });

      const qualifyingCount = opportunities.filter((o) => o.isQualifying).length;
      const lastOpportunityAt = opportunities.length > 0 ? opportunities[0].createdAt : null;

      return {
        flagEnabled,
        hasActiveStripeConnect,
        connectedLocationCount,
        totalLocationCount,
        phorestConnectedLocationCount,
        usesThirdPartyPOS,
        totalOpportunities: opportunities.length,
        qualifyingCount,
        sidebarVisible: flagEnabled && hasActiveStripeConnect && qualifyingCount > 0,
        opportunities,
        lastOpportunityAt,
        effectivePolicy,
        criticalOpsAlertCount: hasCriticalOpsAlerts ? 1 : 0,
        repaymentDistress,
        distressedProjectNames,
        activeProjectCount,
        activeProjectSummaries,
      };
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
