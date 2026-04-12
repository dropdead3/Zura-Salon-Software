/**
 * Surface Priority Engine — Deterministic Ranking & Surface Selection
 *
 * Delegates scoring to canonical capital-formulas.ts.
 * Handles surface filtering, suppression, and cooldown logic.
 *
 * No side effects. No API calls. No AI.
 */

import {
  SURFACE_TYPE_FILTERS,
  type SurfaceArea,
  type OpportunityType,
} from '@/config/capital-engine/zura-capital-config';
import { CANONICAL_SURFACE_COOLDOWNS } from '@/config/capital-engine/capital-formulas-config';
import {
  calculateSurfacePriority,
  calculateRoeScore,
  calculateBreakEvenScore,
  calculateFreshnessScore,
  calculateOpportunityFreshnessDays,
  calculateNetMonthlyGainCents,
  calculateNetImpactScore,
  calculateCoverageRatio,
  calculateRoeRatio,
} from './capital-formulas';

/* ── Types ── */

export interface PriorityOpportunity {
  id: string;
  roe_score: number;
  confidence_score: number;
  business_value_score: number | null;
  momentum_score: number | null;
  effort_score: number | null;
  opportunity_type: string;
  risk_level: string;
  constraint_type: string | null;
  status: string;
  eligibility_status: string;
  detected_at: string;
  expires_at: string | null;
  location_id: string | null;
  service_id: string | null;
  stylist_id: string | null;
  // Optional fields for canonical scoring
  required_investment_cents?: number;
  predicted_revenue_lift_expected_cents?: number;
  break_even_months_expected?: number;
  provider_estimated_payment_cents?: number;
  provider_offer_amount_cents?: number;
}

export interface SurfaceState {
  funding_opportunity_id: string;
  surface_area: string;
  dismissed_at: string | null;
  cooldown_until: string | null;
  show_count: number;
}

export interface PriorityContext {
  activeProjectCount: number;
  recentDismissals: number;
  recentDeclines: number;
}

/* ── Core Priority Computation (delegates to canonical) ── */

export function computeSurfacePriority(
  opp: PriorityOpportunity,
  context: PriorityContext,
): number {
  const freshnessDays = calculateOpportunityFreshnessDays(opp.detected_at);
  const roeScore = calculateRoeScore(opp.roe_score); // roe_score from DB is the ratio
  const breakEvenMonths = opp.break_even_months_expected ?? 9;
  const breakEvenScore = calculateBreakEvenScore(breakEvenMonths);
  const momentumScore = opp.momentum_score ?? 50;
  const businessValueScore = opp.business_value_score ?? 50;
  const confidenceScore = opp.confidence_score;

  // Compute net impact if we have the data
  let netImpactScore = 50; // default when data unavailable
  if (opp.required_investment_cents && opp.predicted_revenue_lift_expected_cents) {
    const paymentCents = opp.provider_estimated_payment_cents ?? 0;
    const netGain = calculateNetMonthlyGainCents(
      opp.predicted_revenue_lift_expected_cents,
      paymentCents,
      breakEvenMonths,
    );
    netImpactScore = calculateNetImpactScore(netGain, opp.required_investment_cents);
  }

  // Coverage ratio for penalty
  const coverage = opp.provider_offer_amount_cents && opp.required_investment_cents
    ? calculateCoverageRatio(opp.provider_offer_amount_cents, opp.required_investment_cents)
    : { ratio: 1.0 }; // no penalty if no coverage data

  return calculateSurfacePriority(
    {
      roeScore,
      confidenceScore,
      businessValueScore,
      breakEvenScore,
      momentumScore,
      constraintType: opp.constraint_type,
      netImpactScore,
    },
    {
      freshnessDays,
      recentDismissCount: context.recentDismissals,
      coverageRatio: coverage.ratio,
      activeProjectCount: context.activeProjectCount,
    },
  );
}

/* ── Surface Selection ── */

export function selectForSurface(
  opportunities: PriorityOpportunity[],
  surfaceArea: SurfaceArea,
  limit: number,
  surfaceStates: SurfaceState[],
  context: PriorityContext,
): PriorityOpportunity[] {
  const now = Date.now();

  // Build suppression set for this surface
  const suppressedIds = new Set<string>();
  for (const ss of surfaceStates) {
    if (ss.surface_area !== surfaceArea) continue;
    if (ss.dismissed_at) {
      const cooldownDays = CANONICAL_SURFACE_COOLDOWNS[surfaceArea] ?? 7;
      const cooldownEnd = ss.cooldown_until
        ? new Date(ss.cooldown_until).getTime()
        : new Date(ss.dismissed_at).getTime() + cooldownDays * 86400000;
      if (now < cooldownEnd) {
        suppressedIds.add(ss.funding_opportunity_id);
      }
    }
  }

  // Filter by surface type
  const allowedTypes = SURFACE_TYPE_FILTERS[surfaceArea];

  return opportunities
    .filter((opp) => {
      if (!['eligible_provider', 'surfaced', 'viewed'].includes(opp.eligibility_status)) return false;
      if (!['detected', 'eligible_internal', 'eligible_provider', 'surfaced', 'viewed'].includes(opp.status)) return false;
      if (suppressedIds.has(opp.id)) return false;
      if (allowedTypes && !allowedTypes.includes(opp.opportunity_type as OpportunityType)) return false;
      if (surfaceArea === 'stylist_dashboard' && !opp.stylist_id) return false;
      return true;
    })
    .map((opp) => ({
      ...opp,
      _priority: computeSurfacePriority(opp, context),
    }))
    .sort((a, b) => (b as any)._priority - (a as any)._priority)
    .slice(0, limit);
}
