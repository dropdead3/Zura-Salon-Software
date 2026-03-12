/**
 * Deterministic billing engine for service allowance overages.
 * No AI, no approximation — pure math only.
 */

export type OverageRateType = 'per_unit' | 'flat' | 'tiered';

export interface AllowanceBillingInput {
  includedAllowanceQty: number;
  actualUsageQty: number;
  overageRate: number;
  overageRateType: OverageRateType;
  overageCap: number | null;
}

export interface AllowanceBillingResult {
  overageQty: number;
  chargeAmount: number;
  isOverage: boolean;
  unusedAllowance: number;
}

/** Round to 2 decimal places for currency */
function roundCost(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate overage charge from usage vs allowance.
 *
 * billable_overage = max(0, actualUsageQty − includedAllowanceQty)
 * charge = billable_overage × overageRate  (per_unit)
 *        = overageRate                     (flat, if overage > 0)
 * charge = min(charge, overageCap)         (if cap set)
 */
export function calculateOverageCharge(input: AllowanceBillingInput): AllowanceBillingResult {
  const {
    includedAllowanceQty,
    actualUsageQty,
    overageRate,
    overageRateType,
    overageCap,
  } = input;

  const overageQty = Math.max(0, actualUsageQty - includedAllowanceQty);
  const unusedAllowance = Math.max(0, includedAllowanceQty - actualUsageQty);

  let charge = 0;

  if (overageQty > 0) {
    switch (overageRateType) {
      case 'per_unit':
        charge = overageQty * overageRate;
        break;
      case 'flat':
        charge = overageRate;
        break;
      case 'tiered':
        // BUG-6 fix: Guard against unimplemented tiered pricing
        // Tiered pricing requires bracket configuration not yet available.
        // Fall back to per_unit with a console warning so salons don't get silent miscalculation.
        console.warn('[AllowanceBilling] Tiered pricing not yet implemented — falling back to per_unit rate');
        charge = overageQty * overageRate;
        break;
    }
  }

  if (overageCap !== null && overageCap >= 0) {
    charge = Math.min(charge, overageCap);
  }

  return {
    overageQty: roundCost(overageQty),
    chargeAmount: roundCost(charge),
    isOverage: overageQty > 0,
    unusedAllowance: roundCost(unusedAllowance),
  };
}
