/**
 * Zura Eligibility Engine — Legacy Compatibility Wrapper
 *
 * Delegates to canonical calculateInternalEligibility from capital-formulas.ts.
 * Kept for backward compatibility with existing consumers.
 *
 * New consumers should import directly from capital-formulas.ts.
 */

import {
  calculateInternalEligibility,
  calculateOpportunityFreshnessDays,
  calculateRoeRatio,
  type EligibilityInputs,
} from './capital-formulas';

/* ── Input Types (kept for backward compat) ── */

export interface ZuraOpportunity {
  id: string;
  roe_score: number;
  confidence: string;
  risk_level: string;
  capital_required: number;
  momentum_score: number | null;
  constraint_type: string | null;
  eligibility_status: string;
  created_at: string;
  expires_at: string | null;
  location_id: string | null;
  stylist_id?: string | null;
}

export interface ZuraOrgContext {
  activeFundedProjectCount: number;
  hasUnderperformingProject: boolean;
  hasCriticalOperationalAlerts: boolean;
  locationExposure: Record<string, number>;
  stylistExposure: Record<string, number>;
  lastDeclinedAt: string | null;
  lastUnderperformingAt: string | null;
}

export interface ZuraEligibilityResult {
  eligible: boolean;
  reasons: string[];
}

/* ── Confidence Mapping (legacy) ── */

function confidenceToNumber(conf: string): number {
  if (conf === 'high') return 90;
  if (conf === 'medium') return 70;
  if (conf === 'low') return 40;
  return 0;
}

/* ── Core Eligibility Check (delegates to canonical) ── */

export function isZuraEligible(
  opportunity: ZuraOpportunity,
  orgContext: ZuraOrgContext,
): ZuraEligibilityResult {
  const freshnessDays = calculateOpportunityFreshnessDays(opportunity.created_at);
  const confidenceScore = confidenceToNumber(opportunity.confidence);

  const inputs: EligibilityInputs = {
    roeRatio: opportunity.roe_score, // legacy passes roe_score as the ratio
    confidenceScore,
    riskLevel: opportunity.risk_level,
    operationalStabilityScore: 70, // default when not available via legacy path
    executionReadinessScore: 70,   // default when not available via legacy path
    activeCapitalProjectsCount: orgContext.activeFundedProjectCount,
    activeUnderperformingProjectsCount: orgContext.hasUnderperformingProject ? 1 : 0,
    repaymentDistressFlag: false,
    opportunityFreshnessDays: freshnessDays,
    requiredInvestmentCents: opportunity.capital_required * 100, // legacy uses dollars
    constraintType: opportunity.constraint_type,
    momentumScore: opportunity.momentum_score,
    hasCriticalOpsAlerts: orgContext.hasCriticalOperationalAlerts,
    expiresAt: opportunity.expires_at,
    locationId: opportunity.location_id,
    locationExposure: opportunity.location_id ? (orgContext.locationExposure[opportunity.location_id] ?? 0) : 0,
    stylistId: opportunity.stylist_id ?? null,
    stylistExposure: opportunity.stylist_id ? (orgContext.stylistExposure[opportunity.stylist_id] ?? 0) : 0,
    lastDeclinedAt: orgContext.lastDeclinedAt,
    lastUnderperformingAt: orgContext.lastUnderperformingAt,
  };

  const result = calculateInternalEligibility(inputs);

  return {
    eligible: result.eligible,
    reasons: result.reasonSummaries,
  };
}
