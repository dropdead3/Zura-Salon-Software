/**
 * Zura Eligibility Engine — Pure Deterministic Validation
 *
 * Pre-Stripe eligibility check. If an opportunity fails Zura eligibility,
 * financing is never surfaced regardless of Stripe availability.
 *
 * No side effects. No API calls. No AI.
 */

import {
  ZURA_ELIGIBILITY_THRESHOLDS,
  isRiskWithinTolerance,
} from '@/config/capital-engine/zura-capital-config';

/* ── Input Types ── */

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

/* ── Confidence Mapping ── */

function confidenceToNumber(conf: string): number {
  if (conf === 'high') return 90;
  if (conf === 'medium') return 70;
  if (conf === 'low') return 40;
  return 0;
}

/* ── Core Eligibility Check ── */

export function isZuraEligible(
  opportunity: ZuraOpportunity,
  orgContext: ZuraOrgContext,
  thresholds = ZURA_ELIGIBILITY_THRESHOLDS,
): ZuraEligibilityResult {
  const reasons: string[] = [];

  // 1. ROE threshold
  if (opportunity.roe_score < thresholds.minROE) {
    reasons.push(`ROE ${opportunity.roe_score.toFixed(1)}x below minimum ${thresholds.minROE}x`);
  }

  // 2. Confidence threshold
  const confScore = confidenceToNumber(opportunity.confidence);
  if (confScore < thresholds.minConfidence) {
    reasons.push(`Confidence "${opportunity.confidence}" (${confScore}) below minimum ${thresholds.minConfidence}`);
  }

  // 3. Risk tolerance
  if (!isRiskWithinTolerance(opportunity.risk_level, thresholds.maxRisk)) {
    reasons.push(`Risk level "${opportunity.risk_level}" exceeds maximum "${thresholds.maxRisk}"`);
  }

  // 4. Capital minimum
  if (opportunity.capital_required < thresholds.minCapitalRequired) {
    reasons.push(`Capital $${opportunity.capital_required.toLocaleString()} below minimum $${thresholds.minCapitalRequired.toLocaleString()}`);
  }

  // 5. Momentum check — severe decline blocks
  if (opportunity.momentum_score !== null && opportunity.momentum_score < 20) {
    reasons.push(`Momentum score ${opportunity.momentum_score} indicates severe decline`);
  }

  // 6. Constraint type — must have a clear use of funds
  if (!opportunity.constraint_type) {
    reasons.push('No constraint type — unclear use of funds');
  }

  // 7. Stale opportunity check
  if (opportunity.expires_at && new Date(opportunity.expires_at) < new Date()) {
    reasons.push('Opportunity has expired');
  } else {
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(opportunity.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreated > thresholds.maxStaleDays) {
      reasons.push(`Opportunity is ${daysSinceCreated} days old (max ${thresholds.maxStaleDays})`);
    }
  }

  // 8. Org-level: concurrent funded projects
  if (orgContext.activeFundedProjectCount >= thresholds.maxConcurrentFundedProjects) {
    reasons.push(`Organization has ${orgContext.activeFundedProjectCount} active funded projects (max ${thresholds.maxConcurrentFundedProjects})`);
  }

  // 9. Org-level: underperforming project
  if (orgContext.hasUnderperformingProject) {
    reasons.push('Organization has an underperforming funded project');
  }

  // 10. Org-level: critical operational alerts
  if (orgContext.hasCriticalOperationalAlerts) {
    reasons.push('Organization has unresolved critical operational alerts');
  }

  // 11. Location exposure limit
  if (opportunity.location_id) {
    const locationExp = orgContext.locationExposure[opportunity.location_id] ?? 0;
    if (locationExp + opportunity.capital_required > thresholds.maxExposurePerLocation) {
      reasons.push(`Location exposure would exceed $${thresholds.maxExposurePerLocation.toLocaleString()} limit`);
    }
  }

  // 12. Stylist exposure limit
  if (opportunity.stylist_id) {
    const stylistExp = orgContext.stylistExposure[opportunity.stylist_id] ?? 0;
    if (stylistExp + opportunity.capital_required > thresholds.maxExposurePerStylist) {
      reasons.push(`Stylist exposure would exceed $${thresholds.maxExposurePerStylist.toLocaleString()} limit`);
    }
  }

  // 13. Decline cooldown
  if (orgContext.lastDeclinedAt) {
    const daysSinceDecline = Math.floor(
      (Date.now() - new Date(orgContext.lastDeclinedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceDecline < thresholds.cooldownAfterDeclineDays) {
      reasons.push(`Decline cooldown: ${thresholds.cooldownAfterDeclineDays - daysSinceDecline} days remaining`);
    }
  }

  // 14. Underperforming cooldown
  if (orgContext.lastUnderperformingAt) {
    const daysSinceUnderperform = Math.floor(
      (Date.now() - new Date(orgContext.lastUnderperformingAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceUnderperform < thresholds.cooldownAfterUnderperformingDays) {
      reasons.push(`Underperformance cooldown: ${thresholds.cooldownAfterUnderperformingDays - daysSinceUnderperform} days remaining`);
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

/**
 * Compute Stripe offer coverage ratio.
 */
export function computeCoverageRatio(
  recommendedInvestment: number,
  stripeOfferAmount: number | null,
): { ratio: number; label: string; covered: boolean } {
  if (!stripeOfferAmount || recommendedInvestment <= 0) {
    return { ratio: 0, label: 'No offer', covered: false };
  }
  const ratio = Math.round((stripeOfferAmount / recommendedInvestment) * 1000) / 10;
  return {
    ratio,
    label: `${ratio}%`,
    covered: ratio >= 100,
  };
}
