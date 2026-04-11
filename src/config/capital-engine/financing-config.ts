/**
 * Financing Layer — Configuration
 *
 * Deterministic thresholds that gate financing eligibility.
 * No AI involvement in eligibility determination.
 */

export const FINANCING_THRESHOLDS = {
  /** Minimum ROE multiplier to qualify */
  minROE: 1.5,
  /** Allowed confidence levels */
  allowedConfidence: ['high', 'medium'] as const,
  /** Allowed risk levels */
  allowedRisk: ['low', 'moderate'] as const,
  /** Minimum capital required ($) */
  minCapitalRequired: 5_000,
  /** Opportunity statuses that can be financed */
  allowedStatuses: ['identified', 'evaluating'] as const,
} as const;

export const FINANCED_PROJECT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Pending Payment', color: 'text-yellow-600' },
  active: { label: 'Active', color: 'text-primary' },
  completed: { label: 'Completed', color: 'text-green-600' },
  defaulted: { label: 'Defaulted', color: 'text-destructive' },
  cancelled: { label: 'Cancelled', color: 'text-muted-foreground' },
};

export const REPAYMENT_DEFAULTS = {
  /** Default repayment term in months */
  termMonths: 12,
  /** Default annual interest rate (0 = interest-free) */
  annualRate: 0,
} as const;

/** Stylist-level financing thresholds — gates micro-financing by SPI/ORS */
export const STYLIST_FINANCING_THRESHOLDS = {
  /** Minimum SPI to access any financing */
  minSPI: 65,
  /** Minimum ORS for expansion-level financing */
  minORS: 60,
} as const;

export function getVarianceLabel(variancePct: number | null): { label: string; status: 'on_track' | 'watch' | 'at_risk' } {
  if (variancePct === null) return { label: 'No Data', status: 'on_track' };
  const abs = Math.abs(variancePct);
  if (abs <= 10) return { label: 'On Track', status: 'on_track' };
  if (abs <= 25) return { label: 'Watch', status: 'watch' };
  return { label: 'At Risk', status: 'at_risk' };
}
