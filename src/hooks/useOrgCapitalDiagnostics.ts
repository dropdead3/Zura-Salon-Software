import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateInternalEligibility,
  calculateRoeRatio,
  calculateOpportunityFreshnessDays,
  type EligibilityInputs,
  type EligibilityResult,
} from '@/lib/capital-engine/capital-formulas';
import { DEFAULT_CAPITAL_POLICY } from '@/config/capital-engine/capital-formulas-config';

const QUALIFYING_STATUSES = ['pending_review', 'approved', 'ready'] as const;
const EXCLUDED_STATUSES = ['canceled', 'expired'] as const;

export interface OpportunityDiagnostic {
  id: string;
  title: string;
  status: string;
  isQualifying: boolean;
  eligibility: EligibilityResult;
  createdAt: string;
}

export interface OrgCapitalDiagnostics {
  flagEnabled: boolean;
  totalOpportunities: number;
  qualifyingCount: number;
  sidebarVisible: boolean;
  opportunities: OpportunityDiagnostic[];
  lastOpportunityAt: string | null;
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

      // 2. Get all non-canceled/expired opportunities
      const { data: opps, error } = await supabase
        .from('capital_funding_opportunities')
        .select('*')
        .eq('organization_id', orgId!)
        .not('status', 'in', `(${EXCLUDED_STATUSES.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const opportunities: OpportunityDiagnostic[] = (opps || []).map((opp) => {
        const isQualifying = QUALIFYING_STATUSES.includes(opp.status as any);

        // Build eligibility inputs from opportunity data
        const inputs: EligibilityInputs = {
          roeRatio: calculateRoeRatio(
            opp.predicted_annual_lift_cents ?? 0,
            opp.required_investment_cents ?? 0,
          ),
          confidenceScore: opp.confidence_score ?? 0,
          riskLevel: opp.risk_level ?? 'critical',
          operationalStabilityScore: opp.operational_stability_score ?? 0,
          executionReadinessScore: opp.execution_readiness_score ?? 0,
          activeCapitalProjectsCount: 0, // org-level, not per-opp
          activeUnderperformingProjectsCount: 0,
          repaymentDistressFlag: false,
          opportunityFreshnessDays: calculateOpportunityFreshnessDays(opp.created_at),
          requiredInvestmentCents: opp.required_investment_cents ?? 0,
          constraintType: opp.constraint_type ?? null,
          momentumScore: opp.momentum_score ?? null,
          hasCriticalOpsAlerts: false,
          expiresAt: opp.expires_at ?? null,
          locationId: opp.location_id ?? null,
          locationExposure: 0,
          stylistId: opp.stylist_user_id ?? null,
          stylistExposure: 0,
          lastDeclinedAt: opp.last_declined_at ?? null,
          lastUnderperformingAt: null,
        };

        const eligibility = calculateInternalEligibility(inputs, DEFAULT_CAPITAL_POLICY);

        return {
          id: opp.id,
          title: opp.title ?? opp.opportunity_type ?? 'Untitled',
          status: opp.status,
          isQualifying,
          eligibility,
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
      };
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
