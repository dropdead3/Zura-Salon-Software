/**
 * Auto-Replenishment Engine — Pure Computation
 *
 * Evaluates replenishment triggers against inventory projections
 * and routes to preferred suppliers. No side effects.
 */

import {
  calculateReplenishment,
  REPLENISHMENT_DEFAULTS as BASE_DEFAULTS,
  type ReplenishmentInput,
} from '@/lib/inventory/replenishment-engine';

export interface ReplenishmentRuleInput {
  ruleId: string;
  productId: string;
  productName: string;
  locationId: string | null;
  enabled: boolean;
  thresholdType: 'days_of_stock' | 'fixed_quantity' | 'forecast_driven';
  thresholdValue: number;
  maxOrderValue: number | null;
  requireApproval: boolean;
  supplierName: string;
  /** Current cost per unit for value cap */
  unitCost: number;
}

export interface InventorySnapshot {
  productId: string;
  locationId: string | null;
  currentOnHand: number;
  openPoQty: number;
  avgDailyUsage: number;
  usageValues: number[];
  leadTimeDays: number;
  moq: number;
  packSize: number;
}

export interface ReplenishmentTriggerResult {
  ruleId: string;
  productId: string;
  productName: string;
  locationId: string | null;
  triggered: boolean;
  triggerReason: string;
  recommendedQty: number;
  supplierName: string;
  requireApproval: boolean;
  daysOfStockRemaining: number;
}

// ── engine ─────────────────────────────────────────────────

export function evaluateReplenishmentTriggers(
  rules: ReplenishmentRuleInput[],
  inventory: InventorySnapshot[]
): ReplenishmentTriggerResult[] {
  const results: ReplenishmentTriggerResult[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const inv = inventory.find(
      (i) => i.productId === rule.productId && i.locationId === rule.locationId
    );

    if (!inv) continue;

    const daysOfStock =
      inv.avgDailyUsage > 0
        ? Math.round(((inv.currentOnHand + inv.openPoQty) / inv.avgDailyUsage) * 100) / 100
        : Infinity;

    let triggered = false;
    let triggerReason = '';

    switch (rule.thresholdType) {
      case 'days_of_stock':
        triggered = daysOfStock <= rule.thresholdValue;
        triggerReason = triggered
          ? `${daysOfStock} days of stock remaining (threshold: ${rule.thresholdValue})`
          : '';
        break;

      case 'fixed_quantity':
        triggered = inv.currentOnHand <= rule.thresholdValue;
        triggerReason = triggered
          ? `${inv.currentOnHand} units on hand (threshold: ${rule.thresholdValue})`
          : '';
        break;

      case 'forecast_driven':
        // Uses full replenishment calculation
        triggered = true;
        triggerReason = 'Forecast-driven evaluation';
        break;
    }

    if (!triggered) {
      results.push({
        ruleId: rule.ruleId,
        productId: rule.productId,
        productName: rule.productName,
        locationId: rule.locationId,
        triggered: false,
        triggerReason: '',
        recommendedQty: 0,
        supplierName: rule.supplierName,
        requireApproval: rule.requireApproval,
        daysOfStockRemaining: daysOfStock === Infinity ? 999 : daysOfStock,
      });
      continue;
    }

    // Calculate recommended quantity using existing engine
    const input: ReplenishmentInput = {
      trailingUsage28d: inv.avgDailyUsage * 28,
      usageValues: inv.usageValues,
      leadTimeDays: inv.leadTimeDays,
      reviewPeriodDays: BASE_DEFAULTS.reviewPeriodDays,
      safetyFactor: BASE_DEFAULTS.safetyFactor,
      minimumBuffer: BASE_DEFAULTS.minimumBuffer,
      currentOnHand: inv.currentOnHand,
      openPoQty: inv.openPoQty,
      moq: inv.moq,
      packSize: inv.packSize,
    };

    const calc = calculateReplenishment(input);
    let recommendedQty = calc.recommendedQty;

    // Apply max order value cap
    if (rule.maxOrderValue && rule.unitCost > 0) {
      const maxUnits = Math.floor(rule.maxOrderValue / rule.unitCost);
      recommendedQty = Math.min(recommendedQty, maxUnits);
    }

    results.push({
      ruleId: rule.ruleId,
      productId: rule.productId,
      productName: rule.productName,
      locationId: rule.locationId,
      triggered: recommendedQty > 0,
      triggerReason: recommendedQty > 0 ? triggerReason : '',
      recommendedQty,
      supplierName: rule.supplierName,
      requireApproval: rule.requireApproval,
      daysOfStockRemaining: daysOfStock === Infinity ? 999 : daysOfStock,
    });
  }

  return results;
}
