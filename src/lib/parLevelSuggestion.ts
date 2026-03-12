/**
 * Smart par-level suggestion utility.
 * Computes optimal stock levels from velocity data.
 */

export interface ParLevelSuggestion {
  /** Recommended par level (units) */
  suggestedPar: number;
  /** Velocity used for calculation (units/day) */
  velocity: number;
  /** Lead time in days */
  leadTimeDays: number;
  /** Safety buffer in days */
  safetyStockDays: number;
  /** Total days of supply */
  totalSupplyDays: number;
  /** Human-readable explanation */
  explanation: string;
}

const DEFAULT_LEAD_TIME_DAYS = 7;
const DEFAULT_SAFETY_STOCK_DAYS = 7;

/**
 * Calculate suggested par level from velocity.
 * Formula: ceil(velocity × (leadTime + safetyStock))
 * 
 * @param velocity - units sold per day
 * @param leadTimeDays - supplier lead time (uses avg_delivery_days from supplier if available, else default 7)
 * @param safetyStockDays - safety buffer in days
 */
export function suggestParLevel(
  velocity: number,
  leadTimeDays: number = DEFAULT_LEAD_TIME_DAYS,
  safetyStockDays: number = DEFAULT_SAFETY_STOCK_DAYS,
): ParLevelSuggestion {
  // Clamp lead time to reasonable bounds
  const effectiveLeadTime = Math.max(1, Math.min(leadTimeDays, 90));
  const totalSupplyDays = effectiveLeadTime + safetyStockDays;
  const suggestedPar = velocity > 0 ? Math.ceil(velocity * totalSupplyDays) : 0;

  return {
    suggestedPar,
    velocity,
    leadTimeDays: effectiveLeadTime,
    safetyStockDays,
    totalSupplyDays,
    explanation: velocity > 0
      ? `${velocity.toFixed(2)} units/day × ${totalSupplyDays} days supply (${effectiveLeadTime}d lead + ${safetyStockDays}d safety) = ${suggestedPar} units`
      : 'No recent sales — par level not recommended',
  };
}
