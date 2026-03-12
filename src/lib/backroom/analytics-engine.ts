/**
 * Backroom Analytics Engine — Pure calculation functions.
 * No side effects, no DB access. All inputs are pre-fetched data.
 */

// ── Types ──────────────────────────────────────────────────────────

export interface ChemicalCostInput {
  totalProductCost: number;
  completedServiceCount: number;
}

export interface WasteInput {
  totalWasteQty: number;
  totalDispensedQty: number;
}

export interface ReweighComplianceInput {
  totalBowls: number;
  reweighedBowls: number;
}

export interface GhostLossInput {
  /** Sum of stock_movements with reason='usage' for the period */
  theoreticalDepletion: number;
  /** beginning_on_hand - ending_on_hand - receiving_in + transfers_out */
  actualStockDecrease: number;
}

export interface GhostLossResult {
  ghostLossQty: number;
  ghostLossCost: number;
  hasSignificantLoss: boolean;
}

export interface ContributionMarginInput {
  serviceRevenue: number;
  productCost: number;
  laborEstimate: number;
}

export interface ContributionMarginResult {
  contributionMargin: number;
  marginPct: number;
  isHealthy: boolean;
}

export interface StaffSessionData {
  staffUserId: string;
  staffName: string;
  sessionCount: number;
  totalDurationMinutes: number;
  totalWasteQty: number;
  totalDispensedQty: number;
  totalOverageQty: number;
  totalUnderageQty: number;
  bowlsTotal: number;
  bowlsReweighed: number;
}

export interface StaffMetric {
  staffUserId: string;
  staffName: string;
  sessionsPerDay: number;
  avgSessionDurationMinutes: number;
  wastePct: number;
  variancePct: number;
  reweighCompliancePct: number;
}

export interface InventoryDaysInput {
  productId: string;
  productName: string;
  onHand: number;
  dailyUsageRate: number;
  costPrice: number;
}

export interface InventoryDaysResult {
  productId: string;
  productName: string;
  daysRemaining: number;
  isLow: boolean;
  costAtRisk: number;
}

// ── Calculations ───────────────────────────────────────────────────

/**
 * Average chemical/product cost per completed service.
 */
export function calculateChemicalCostPerService(
  input: ChemicalCostInput
): number {
  if (input.completedServiceCount === 0) return 0;
  return Math.round((input.totalProductCost / input.completedServiceCount) * 100) / 100;
}

/**
 * Waste as a percentage of total dispensed product.
 */
export function calculateWastePercentage(input: WasteInput): number {
  if (input.totalDispensedQty === 0) return 0;
  return Math.round((input.totalWasteQty / input.totalDispensedQty) * 1000) / 10;
}

/**
 * Reweigh compliance rate.
 */
export function calculateReweighCompliance(input: ReweighComplianceInput): number {
  if (input.totalBowls === 0) return 100;
  return Math.round((input.reweighedBowls / input.totalBowls) * 1000) / 10;
}

/**
 * Ghost loss = theoretical depletion - actual stock decrease.
 * Positive = unexplained shrinkage.
 */
export function calculateGhostLoss(
  input: GhostLossInput,
  avgCostPerUnit: number = 0,
  significanceThreshold: number = 5
): GhostLossResult {
  const ghostLossQty = Math.round((input.theoreticalDepletion - input.actualStockDecrease) * 100) / 100;
  const ghostLossCost = Math.round(ghostLossQty * avgCostPerUnit * 100) / 100;

  return {
    ghostLossQty,
    ghostLossCost,
    hasSignificantLoss: Math.abs(ghostLossQty) > significanceThreshold,
  };
}

/**
 * Contribution margin = service_revenue - product_cost - labor_estimate.
 */
export function calculateContributionMargin(
  input: ContributionMarginInput
): ContributionMarginResult {
  const contributionMargin = Math.round(
    (input.serviceRevenue - input.productCost - input.laborEstimate) * 100
  ) / 100;

  const marginPct =
    input.serviceRevenue > 0
      ? Math.round((contributionMargin / input.serviceRevenue) * 1000) / 10
      : 0;

  return {
    contributionMargin,
    marginPct,
    isHealthy: marginPct >= 50,
  };
}

/**
 * Per-staff efficiency metrics.
 * @param daysInPeriod Number of working days in the date range.
 */
export function calculateStaffEfficiency(
  staffData: StaffSessionData[],
  daysInPeriod: number = 1
): StaffMetric[] {
  const safeDays = Math.max(daysInPeriod, 1);

  return staffData.map((s) => ({
    staffUserId: s.staffUserId,
    staffName: s.staffName,
    sessionsPerDay: Math.round((s.sessionCount / safeDays) * 10) / 10,
    avgSessionDurationMinutes:
      s.sessionCount > 0
        ? Math.round((s.totalDurationMinutes / s.sessionCount) * 10) / 10
        : 0,
    wastePct:
      s.totalDispensedQty > 0
        ? Math.round((s.totalWasteQty / s.totalDispensedQty) * 1000) / 10
        : 0,
    variancePct:
      s.totalDispensedQty > 0
        ? Math.round(
            ((s.totalOverageQty - s.totalUnderageQty) / s.totalDispensedQty) * 1000
          ) / 10
        : 0,
    reweighCompliancePct:
      s.bowlsTotal > 0
        ? Math.round((s.bowlsReweighed / s.bowlsTotal) * 1000) / 10
        : 100,
  }));
}

/**
 * Inventory days remaining projection per product.
 */
export function calculateInventoryDaysRemaining(
  products: InventoryDaysInput[],
  lowThresholdDays: number = 7
): InventoryDaysResult[] {
  return products.map((p) => {
    const daysRemaining =
      p.dailyUsageRate > 0
        ? Math.round((p.onHand / p.dailyUsageRate) * 10) / 10
        : p.onHand > 0
          ? 999
          : 0;

    return {
      productId: p.productId,
      productName: p.productName,
      daysRemaining,
      isLow: daysRemaining < lowThresholdDays && daysRemaining !== 999,
      costAtRisk: Math.round(p.onHand * p.costPrice * 100) / 100,
    };
  });
}
