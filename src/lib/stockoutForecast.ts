/**
 * Stockout forecasting utility.
 * Projects when a product will run out based on velocity.
 */

export interface StockoutForecast {
  /** Days until product is out of stock. Infinity if no sales. */
  daysUntilStockout: number;
  /** Projected stockout date, or null if no sales */
  stockoutDate: Date | null;
  /** Whether product needs reorder NOW (days < leadTime) */
  needsReorderNow: boolean;
  /** Urgency tier for color coding */
  urgency: 'critical' | 'warning' | 'ok' | 'no-sales';
}

const DEFAULT_LEAD_TIME_DAYS = 7;

/**
 * Forecast when a product will stock out.
 */
export function forecastStockout(
  quantityOnHand: number,
  velocity: number,
  leadTimeDays: number = DEFAULT_LEAD_TIME_DAYS,
): StockoutForecast {
  if (quantityOnHand <= 0) {
    return {
      daysUntilStockout: 0,
      stockoutDate: new Date(),
      needsReorderNow: true,
      urgency: 'critical',
    };
  }

  if (velocity <= 0) {
    return {
      daysUntilStockout: Infinity,
      stockoutDate: null,
      needsReorderNow: false,
      urgency: 'no-sales',
    };
  }

  const daysUntilStockout = Math.round(quantityOnHand / velocity);
  const stockoutDate = new Date();
  stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);
  const needsReorderNow = daysUntilStockout <= leadTimeDays;
  const urgency = daysUntilStockout <= 7 ? 'critical' : daysUntilStockout <= 14 ? 'warning' : 'ok';

  return { daysUntilStockout, stockoutDate, needsReorderNow, urgency };
}
