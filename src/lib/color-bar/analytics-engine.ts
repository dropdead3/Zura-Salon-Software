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
  totalProductCost: number;
}

export interface StaffMetric {
  staffUserId: string;
  staffName: string;
  sessionsPerDay: number;
  avgSessionDurationMinutes: number;
  wastePct: number;
  variancePct: number;
  reweighCompliancePct: number;
  totalServices: number;
  totalProductCost: number;
  totalDispensedQty: number;
  productPerServiceCost: number;
  productPerServiceQty: number;
  wastePerServiceCost: number;
  productCharges: number;
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

// ── Mix Confidence Score ───────────────────────────────────────────

export interface MixConfidenceInput {
  /** Total bowl lines */
  totalLines: number;
  /** Lines captured via scale (not manual) */
  scaleLines: number;
  /** Total bowls */
  totalBowls: number;
  /** Bowls that were reweighed */
  reweighedBowls: number;
  /** Actual usage relative to baseline (1.0 = exactly baseline) */
  usageToBaselineRatio: number;
  /** Total waste events */
  totalWasteEvents: number;
  /** Waste events with a category assigned */
  categorizedWasteEvents: number;
}

/**
 * Calculate mix session confidence score (0-100).
 * Factors: scale usage (30%), reweigh completion (25%),
 * variance from baseline (25%), waste classification (20%).
 */
export function calculateMixConfidence(input: MixConfidenceInput): number {
  // Scale vs manual (30%)
  const scalePct = input.totalLines > 0
    ? (input.scaleLines / input.totalLines)
    : 0;
  const scaleScore = 60 + (scalePct * 40); // 60 if all manual, 100 if all scale

  // Reweigh completion (25%)
  const reweighScore = input.totalBowls > 0
    ? (input.reweighedBowls / input.totalBowls) * 100
    : 100;

  // Variance from baseline (25%)
  let varianceScore = 100;
  if (input.usageToBaselineRatio > 0) {
    const deviation = Math.abs(1 - input.usageToBaselineRatio);
    if (deviation <= 0.1) varianceScore = 100;
    else if (deviation >= 0.5) varianceScore = 0;
    else varianceScore = Math.round(100 * (1 - (deviation - 0.1) / 0.4));
  }

  // Waste classification (20%)
  const wasteScore = input.totalWasteEvents > 0
    ? (input.categorizedWasteEvents / input.totalWasteEvents) * 100
    : 100; // No waste = full score

  const weighted = (scaleScore * 0.3) + (reweighScore * 0.25) + (varianceScore * 0.25) + (wasteScore * 0.2);
  return Math.round(Math.min(100, Math.max(0, weighted)));
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

  return staffData.map((s) => {
    const wastePct =
      s.totalDispensedQty > 0
        ? Math.round((s.totalWasteQty / s.totalDispensedQty) * 1000) / 10
        : 0;
    const totalProductCost = s.totalProductCost ?? 0;
    const sessionCount = s.sessionCount || 1;

    return {
      staffUserId: s.staffUserId,
      staffName: s.staffName,
      sessionsPerDay: Math.round((s.sessionCount / safeDays) * 10) / 10,
      avgSessionDurationMinutes:
        s.sessionCount > 0
          ? Math.round((s.totalDurationMinutes / s.sessionCount) * 10) / 10
          : 0,
      wastePct,
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
      totalServices: s.sessionCount,
      totalProductCost: Math.round(totalProductCost * 100) / 100,
      totalDispensedQty: Math.round(s.totalDispensedQty * 10) / 10,
      productPerServiceCost: Math.round((totalProductCost / sessionCount) * 100) / 100,
      productPerServiceQty: Math.round((s.totalDispensedQty / sessionCount) * 10) / 10,
      wastePerServiceCost: Math.round(((wastePct / 100) * totalProductCost / sessionCount) * 100) / 100,
      productCharges: 0, // populated externally
    };
  });
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
