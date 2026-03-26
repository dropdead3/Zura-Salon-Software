/**
 * Price Recommendation Engine
 * 
 * Calculates recommended service prices based on product costs (from recipe baselines)
 * and target margin percentages. Flags services where current margin falls below target.
 */

export interface ProductCostInput {
  product_id: string;
  expected_quantity: number; // grams
  cost_per_gram: number;
}

export interface PriceRecommendation {
  service_id: string;
  service_name: string;
  category: string | null;
  current_price: number;
  product_cost: number;
  current_margin_pct: number;
  target_margin_pct: number;
  recommended_price: number;
  price_delta: number;
  price_delta_pct: number;
  is_below_target: boolean;
}

/**
 * Calculate total product cost for a service from its recipe baselines.
 */
export function calculateProductCost(baselines: ProductCostInput[]): number {
  return baselines.reduce((sum, b) => sum + b.expected_quantity * b.cost_per_gram, 0);
}

/**
 * Calculate the recommended price given a product cost and target margin.
 * Formula: price = cost / (1 - margin/100)
 */
export function calculateRecommendedPrice(productCost: number, targetMarginPct: number): number {
  if (targetMarginPct >= 100) return productCost * 10; // Safety cap
  if (targetMarginPct <= 0) return productCost;
  return productCost / (1 - targetMarginPct / 100);
}

/**
 * Calculate current margin percentage.
 * Formula: margin = ((price - cost) / price) * 100
 */
export function calculateMarginPct(price: number, productCost: number): number {
  if (price <= 0) return 0;
  return ((price - productCost) / price) * 100;
}

/**
 * Build a full price recommendation for a service.
 */
export function buildRecommendation(params: {
  service_id: string;
  service_name: string;
  category: string | null;
  current_price: number;
  baselines: ProductCostInput[];
  target_margin_pct: number;
  margin_gap_threshold?: number; // default 2%
}): PriceRecommendation | null {
  const { service_id, service_name, category, current_price, baselines, target_margin_pct, margin_gap_threshold = 2 } = params;

  if (baselines.length === 0) return null;
  if (current_price <= 0) return null;

  const productCost = calculateProductCost(baselines);
  if (productCost <= 0) return null;

  const currentMarginPct = calculateMarginPct(current_price, productCost);
  const recommendedPrice = calculateRecommendedPrice(productCost, target_margin_pct);
  const priceDelta = recommendedPrice - current_price;
  const priceDeltaPct = current_price > 0 ? (priceDelta / current_price) * 100 : 0;
  const isBelowTarget = currentMarginPct < target_margin_pct - margin_gap_threshold;

  return {
    service_id,
    service_name,
    category,
    current_price,
    product_cost: productCost,
    current_margin_pct: Math.round(currentMarginPct * 10) / 10,
    target_margin_pct,
    recommended_price: Math.round(recommendedPrice * 100) / 100,
    price_delta: Math.round(priceDelta * 100) / 100,
    price_delta_pct: Math.round(priceDeltaPct * 10) / 10,
    is_below_target: isBelowTarget,
  };
}

/**
 * Calculate the scaling ratio for propagating a price change to level/location prices.
 */
export function calculateScalingRatio(newPrice: number, oldPrice: number): number {
  if (oldPrice <= 0) return 1;
  return newPrice / oldPrice;
}
