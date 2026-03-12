/**
 * Replenishment Engine — Phase 4
 *
 * Pure, deterministic calculations for inventory replenishment.
 * No side effects, no API calls, no AI.
 */

export interface ReplenishmentInput {
  /** Total units consumed in the trailing 28-day window */
  trailingUsage28d: number;
  /** Daily usage values (up to 28 entries) for standard-deviation calc */
  usageValues: number[];
  /** Supplier lead time in calendar days */
  leadTimeDays: number;
  /** Review cycle length in days (default 7 = weekly) */
  reviewPeriodDays: number;
  /** Z-score for desired service level (default 1.65 ≈ 95%) */
  safetyFactor: number;
  /** Absolute minimum safety buffer in units */
  minimumBuffer: number;
  /** Current warehouse / shelf quantity */
  currentOnHand: number;
  /** Units already on open (non-received) POs */
  openPoQty: number;
  /** Minimum order quantity from vendor */
  moq: number;
  /** Units per case / pack */
  packSize: number;
}

export interface ReplenishmentResult {
  dailyUsageRate: number;
  usageStddev: number;
  leadTimeDemand: number;
  safetyStock: number;
  reorderPoint: number;
  targetStock: number;
  /** Quantity to order, rounded up to MOQ / pack-size */
  recommendedQty: number;
  needsReorder: boolean;
}

// ── helpers ────────────────────────────────────────────────

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function roundCeil(value: number, step: number): number {
  if (step <= 0) return Math.ceil(value);
  return Math.ceil(value / step) * step;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── engine ─────────────────────────────────────────────────

export function calculateReplenishment(input: ReplenishmentInput): ReplenishmentResult {
  const {
    trailingUsage28d,
    usageValues,
    leadTimeDays,
    reviewPeriodDays,
    safetyFactor,
    minimumBuffer,
    currentOnHand,
    openPoQty,
    moq,
    packSize,
  } = input;

  // daily_usage_rate = trailing_28_day_usage / 28
  const dailyUsageRate = round2(trailingUsage28d / 28);

  // usage standard deviation (sample)
  const usageStddev = round2(stddev(usageValues));

  // lead_time_demand = daily_usage_rate × lead_time_days
  const leadTimeDemand = round2(dailyUsageRate * leadTimeDays);

  // safety_stock = max(usage_stddev × safety_factor, minimum_buffer)
  const safetyStock = round2(Math.max(usageStddev * safetyFactor, minimumBuffer));

  // reorder_point = lead_time_demand + safety_stock
  const reorderPoint = round2(leadTimeDemand + safetyStock);

  // review_period_demand = daily_usage_rate × review_period_days
  const reviewPeriodDemand = round2(dailyUsageRate * reviewPeriodDays);

  // target_stock = lead_time_demand + review_period_demand + safety_stock
  const targetStock = round2(leadTimeDemand + reviewPeriodDemand + safetyStock);

  // effective position includes on-hand + in-transit
  const effectivePosition = currentOnHand + openPoQty;

  // raw order quantity
  const rawQty = Math.max(0, targetStock - effectivePosition);

  // round up to nearest MOQ or pack-size multiple (whichever is larger)
  const orderMultiple = Math.max(moq, packSize, 1);
  const recommendedQty = rawQty > 0 ? roundCeil(rawQty, orderMultiple) : 0;

  // needs reorder when effective position is at or below reorder point
  const needsReorder = effectivePosition <= reorderPoint;

  return {
    dailyUsageRate,
    usageStddev,
    leadTimeDemand,
    safetyStock,
    reorderPoint,
    targetStock,
    recommendedQty,
    needsReorder,
  };
}

/** Default input values for partial overrides */
export const REPLENISHMENT_DEFAULTS = {
  reviewPeriodDays: 7,
  safetyFactor: 1.65,
  minimumBuffer: 2,
  moq: 1,
  packSize: 1,
} as const;
