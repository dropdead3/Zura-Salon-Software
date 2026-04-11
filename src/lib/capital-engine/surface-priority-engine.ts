/**
 * Surface Priority Engine — Deterministic Ranking & Surface Selection
 *
 * Computes surface_priority for funding opportunities and filters
 * them for display on specific UI surfaces.
 *
 * No side effects. No API calls. No AI.
 */

import {
  SURFACE_PRIORITY_WEIGHTS,
  SURFACE_TYPE_FILTERS,
  SURFACE_COOLDOWN_DEFAULTS,
  type SurfaceArea,
  type OpportunityType,
} from '@/config/capital-engine/zura-capital-config';

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

/* ── Constraint Severity Mapping ── */

const CONSTRAINT_SEVERITY: Record<string, number> = {
  capacity_bottleneck: 90,
  service_waitlist_pressure: 85,
  inventory_bottleneck: 80,
  understocking_risk: 75,
  strong_demand: 70,
  stylist_ready_to_scale: 60,
  market_opportunity: 55,
  page_or_campaign_growth_gap: 50,
};

/* ── Urgency Scoring ── */

function computeUrgency(opp: PriorityOpportunity): number {
  if (opp.expires_at) {
    const daysUntilExpiry = Math.max(
      0,
      (new Date(opp.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntilExpiry <= 7) return 95;
    if (daysUntilExpiry <= 14) return 80;
    if (daysUntilExpiry <= 30) return 60;
    return 30;
  }
  // No expiry — use age as inverse urgency
  const daysSinceDetected = Math.max(
    0,
    (Date.now() - new Date(opp.detected_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSinceDetected <= 7) return 70;
  if (daysSinceDetected <= 30) return 50;
  return 20;
}

/* ── Staleness Penalty ── */

function stalenessPenalty(opp: PriorityOpportunity): number {
  const daysSinceDetected = Math.max(
    0,
    (Date.now() - new Date(opp.detected_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSinceDetected > 90) return 30;
  if (daysSinceDetected > 60) return 15;
  if (daysSinceDetected > 30) return 5;
  return 0;
}

/* ── Core Priority Computation ── */

export function computeSurfacePriority(
  opp: PriorityOpportunity,
  context: PriorityContext,
): number {
  const w = SURFACE_PRIORITY_WEIGHTS;

  // Normalize ROE to 0–100 scale (cap at 5x = 100)
  const roeNorm = Math.min(100, (opp.roe_score / 5) * 100);

  // Confidence is already 0–100
  const confNorm = opp.confidence_score;

  // Business value: 0–100, default 50
  const bvNorm = opp.business_value_score ?? 50;

  // Momentum: 0–100, default 50
  const momentumNorm = opp.momentum_score ?? 50;

  // Urgency: computed
  const urgencyNorm = computeUrgency(opp);

  // Constraint severity: mapped
  const constraintNorm = opp.constraint_type
    ? (CONSTRAINT_SEVERITY[opp.constraint_type] ?? 40)
    : 30;

  const rawScore =
    roeNorm * w.roe +
    confNorm * w.confidence +
    bvNorm * w.businessValue +
    momentumNorm * w.momentum +
    urgencyNorm * w.urgency +
    constraintNorm * w.constraintSeverity;

  // Apply penalties
  let penalty = stalenessPenalty(opp);
  if (context.activeProjectCount > 0) penalty += context.activeProjectCount * 3;
  if (context.recentDismissals > 0) penalty += context.recentDismissals * 5;
  if (context.recentDeclines > 0) penalty += context.recentDeclines * 8;

  return Math.max(0, Math.round(rawScore - penalty));
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
    // Dismissed and not past cooldown
    if (ss.dismissed_at) {
      const cooldownDays = SURFACE_COOLDOWN_DEFAULTS[surfaceArea] ?? 7;
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
      // Must be surfaceable status
      if (!['eligible_provider', 'surfaced', 'viewed'].includes(opp.eligibility_status)) return false;
      if (!['detected', 'eligible_internal', 'eligible_provider', 'surfaced', 'viewed'].includes(opp.status)) return false;

      // Suppression check
      if (suppressedIds.has(opp.id)) return false;

      // Type filter
      if (allowedTypes && !allowedTypes.includes(opp.opportunity_type as OpportunityType)) return false;

      // Scope filter for specific surfaces
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
