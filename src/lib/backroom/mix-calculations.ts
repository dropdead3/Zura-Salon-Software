/**
 * Zura Backroom — Deterministic Calculation Module
 * 
 * All mixing math lives here. No AI, no approximation.
 * These are source-of-truth calculations for usage, cost, and waste.
 */

export interface BowlLineInput {
  dispensed_quantity: number;
  dispensed_cost_snapshot: number; // cost per unit at time of dispensing
  dispensed_unit: string;
}

export interface ReweighInput {
  leftover_quantity: number;
  leftover_unit: string;
}

export interface WasteInput {
  quantity: number;
  unit: string;
}

// ─── Net Usage ───────────────────────────────────────
/**
 * Deterministic net usage for a single bowl.
 * net_usage = dispensed - leftover - approved_discard_adjustment
 */
export function calculateNetUsage(
  totalDispensed: number,
  leftoverQuantity: number,
  approvedDiscardAdjustment: number = 0
): number {
  const net = totalDispensed - leftoverQuantity - approvedDiscardAdjustment;
  return Math.max(0, roundWeight(net));
}

// ─── Bowl Cost ───────────────────────────────────────
/**
 * Total cost of a bowl = SUM(line.dispensed_quantity * line.dispensed_cost_snapshot)
 */
export function calculateBowlCost(lines: BowlLineInput[]): number {
  return roundCost(
    lines.reduce((sum, line) => sum + line.dispensed_quantity * line.dispensed_cost_snapshot, 0)
  );
}

/**
 * Total dispensed weight of a bowl = SUM(line.dispensed_quantity)
 */
export function calculateBowlWeight(lines: BowlLineInput[]): number {
  return roundWeight(
    lines.reduce((sum, line) => sum + line.dispensed_quantity, 0)
  );
}

// ─── Session Totals ──────────────────────────────────
export interface BowlSummary {
  totalDispensedWeight: number;
  totalDispensedCost: number;
  leftoverWeight: number;
  netUsageWeight: number;
}

/**
 * Aggregate session cost across all bowls.
 */
export function calculateSessionCost(bowls: BowlSummary[]): number {
  return roundCost(bowls.reduce((sum, b) => sum + b.totalDispensedCost, 0));
}

/**
 * Aggregate net usage across all bowls.
 */
export function calculateSessionNetUsage(bowls: BowlSummary[]): number {
  return roundWeight(bowls.reduce((sum, b) => sum + b.netUsageWeight, 0));
}

/**
 * Aggregate waste across all waste events in a session.
 */
export function calculateTotalWaste(wasteEvents: WasteInput[]): number {
  return roundWeight(wasteEvents.reduce((sum, w) => sum + w.quantity, 0));
}

// ─── Formula Extraction ──────────────────────────────
export interface FormulaLine {
  product_id: string | null;
  product_name: string;
  brand: string | null;
  quantity: number;
  unit: string;
}

/**
 * Extract actual formula from bowl lines (what was dispensed).
 */
export function extractActualFormula(
  lines: Array<{
    product_id: string | null;
    product_name_snapshot: string;
    brand_snapshot: string | null;
    dispensed_quantity: number;
    dispensed_unit: string;
  }>
): FormulaLine[] {
  return lines.map((l) => ({
    product_id: l.product_id,
    product_name: l.product_name_snapshot,
    brand: l.brand_snapshot,
    quantity: roundWeight(l.dispensed_quantity),
    unit: l.dispensed_unit,
  }));
}

/**
 * Extract refined formula from bowl lines + reweigh data.
 * Scales each line proportionally based on net usage ratio.
 */
export function extractRefinedFormula(
  lines: Array<{
    product_id: string | null;
    product_name_snapshot: string;
    brand_snapshot: string | null;
    dispensed_quantity: number;
    dispensed_unit: string;
  }>,
  totalDispensed: number,
  netUsage: number
): FormulaLine[] {
  if (totalDispensed <= 0) return extractActualFormula(lines);

  const ratio = netUsage / totalDispensed;

  return lines.map((l) => ({
    product_id: l.product_id,
    product_name: l.product_name_snapshot,
    brand: l.brand_snapshot,
    quantity: roundWeight(l.dispensed_quantity * ratio),
    unit: l.dispensed_unit,
  }));
}

// ─── Helpers ─────────────────────────────────────────
/** Round weight to 2 decimal places */
export function roundWeight(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Round cost to 4 decimal places */
export function roundCost(value: number): number {
  return Math.round(value * 10000) / 10000;
}
