import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateInternalEligibility,
  calculateOpportunityFreshnessDays,
  type EligibilityInputs,
  type EligibilityResult,
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
  inputs: EligibilityInputs;
  policy: CapitalPolicy;
  createdAt: string;
}

export interface OrgCapitalDiagnostics {
  flagEnabled: boolean;
  totalOpportunities: number;
  qualifyingCount: number;
  sidebarVisible: boolean;
  opportunities: OpportunityDiagnostic[];
  lastOpportunityAt: string | null;
  effectivePolicy: CapitalPolicy;
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
        .select('id, status, repayment_status, funded_amount_cents, capital_funding_opportunities(location_id, stylist_id)')
        .eq('organization_id', orgId!)
        .in('status', ['active', 'on_track', 'above_forecast', 'below_forecast', 'at_risk']);

      const activeProjectCount = activeProjects?.length ?? 0;
      const underperformingCount = (activeProjects ?? []).filter(p => p.status === 'at_risk').length;
      const repaymentDistress = (activeProjects ?? []).some(p => p.repayment_status === 'delinquent');

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
          hasCriticalOpsAlerts: false,
          expiresAt: opp.expires_at ?? null,
          locationId: opp.location_id ?? null,
          locationExposure: opp.location_id ? (locationExposureMap.get(opp.location_id) ?? 0) : 0,
          stylistId: opp.stylist_id ?? null,
          stylistExposure: opp.stylist_id ? (stylistExposureMap.get(opp.stylist_id) ?? 0) : 0,
          lastDeclinedAt: null,
          lastUnderperformingAt: null,
        };

        const eligibility = calculateInternalEligibility(inputs, effectivePolicy);

        return {
          id: opp.id,
          title: opp.title ?? opp.opportunity_type ?? 'Untitled',
          status: opp.status,
          isQualifying,
          eligibility,
          inputs,
          policy: effectivePolicy,
          createdAt: opp.created_at,
        };
      });

      const qualifyingCount = opportunities.filter((o) => o.isQualifying).length;
      const lastOpportunityAt = opportunities.length > 0 ? opportunities[0].createdAt : null;

      return {
        flagEnabled,
        totalOpportunities: opportunities.length,
        qualifyingCount,
        sidebarVisible: flagEnabled && qualifyingCount > 0,
        opportunities,
        lastOpportunityAt,
        effectivePolicy,
      };
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
