/**
 * Allowance Health Check — Industry-standard methodology.
 *
 * Product allowance (at retail/after-markup cost) should be
 * 6–10% of the service price, with 8% as the target.
 *
 * If above 10%: product cost is too high or service is underpriced.
 * If below 6%: room to increase product quality or reduce service price.
 */

export interface AllowanceHealthInput {
  /** Dollar allowance computed at retail (after-markup) cost */
  allowanceAmount: number;
  /** Service price charged to the client */
  servicePrice: number;
}

export type AllowanceHealthStatus = 'healthy' | 'high' | 'low';

export interface AllowanceHealthResult {
  allowancePct: number;
  targetPct: number;
  lowerBound: number;
  upperBound: number;
  status: AllowanceHealthStatus;
  message: string;
  /** If high, what price would bring allowance to 8% */
  suggestedServicePrice: number | null;
  /** If low, what allowance would hit 8% */
  suggestedAllowance: number | null;
}

const TARGET_PCT = 8;
const LOWER_BOUND = 6;
const UPPER_BOUND = 10;

/** Round to 2 decimal places */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Round to 4 decimal places (for per-gram costs) */
function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/** Round up to the nearest $5 increment */
function roundUpTo5(v: number): number {
  return Math.ceil(v / 5) * 5;
}

/**
 * Calculate retail (after-markup) cost per gram.
 * retailCpg = wholesaleCpg × (1 + markupPct / 100)
 */
export function calculateRetailCostPerGram(wholesaleCpg: number, markupPct: number): number {
  return r2(wholesaleCpg * (1 + markupPct / 100));
}

/**
 * Evaluate allowance health relative to service price.
 */
export function calculateAllowanceHealth(input: AllowanceHealthInput): AllowanceHealthResult {
  const { allowanceAmount, servicePrice } = input;

  if (servicePrice <= 0 || allowanceAmount <= 0) {
    return {
      allowancePct: 0,
      targetPct: TARGET_PCT,
      lowerBound: LOWER_BOUND,
      upperBound: UPPER_BOUND,
      status: 'low',
      message: 'Insufficient data to evaluate allowance health.',
      suggestedServicePrice: null,
      suggestedAllowance: null,
    };
  }

  const allowancePct = r2((allowanceAmount / servicePrice) * 100);

  let status: AllowanceHealthStatus;
  let message: string;
  let suggestedServicePrice: number | null = null;
  let suggestedAllowance: number | null = null;

  if (allowancePct > UPPER_BOUND) {
    status = 'high';
    suggestedServicePrice = roundUpTo5(allowanceAmount / (TARGET_PCT / 100));
    message = `Product cost is ${allowancePct}% of service price. Consider raising service price to $${suggestedServicePrice} or reducing product usage.`;
  } else if (allowancePct < LOWER_BOUND) {
    status = 'low';
    suggestedAllowance = r2(servicePrice * (TARGET_PCT / 100));
    message = `Allowance is only ${allowancePct}% of service price. You may increase product quality or reduce service price.`;
  } else {
    status = 'healthy';
    message = `Allowance is ${allowancePct}% of service price — within the ideal 6–10% range.`;
  }

  return {
    allowancePct,
    targetPct: TARGET_PCT,
    lowerBound: LOWER_BOUND,
    upperBound: UPPER_BOUND,
    status,
    message,
    suggestedServicePrice,
    suggestedAllowance,
  };
}
