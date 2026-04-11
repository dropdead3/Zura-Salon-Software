/**
 * Capital & Expansion Engine — Pure Computation
 *
 * SPI scoring, ROE calculation, risk modeling, capital queue ranking,
 * break-even estimation, and investment scenario simulation.
 *
 * All functions are deterministic. No side effects. No API calls.
 */

import {
  SPI_WEIGHTS,
  CONFIDENCE_MULTIPLIERS,
  RISK_FACTORS,
} from '@/config/capital-engine/capital-config';

// ── Types ────────────────────────────────────────────────────────────

export interface SPIInput {
  /** Health Engine revenue category score (0–100) */
  revenueScore: number;
  /** SEO momentum score (0–100) + booking growth signals */
  growthScore: number;
  /** Health Engine client category + SEO conversion health (0–100) */
  conversionScore: number;
  /** Avg ticket vs benchmark, elasticity (0–100) */
  pricingScore: number;
  /** Retention + operational consistency (0–100) */
  stabilityScore: number;
  /** Task completion rate + campaign success (0–100) */
  executionScore: number;
}

export interface SPIResult {
  spiScore: number;
  revenueEfficiency: number;
  growthVelocity: number;
  conversionStrength: number;
  pricingPower: number;
  operationalStability: number;
  executionQuality: number;
}

export interface RiskInput {
  /** Revenue coefficient of variation (0–1, higher = more volatile) */
  volatility: number;
  /** Revenue share of top stylist (0–1, higher = more dependent) */
  stylistDependency: number;
  /** Competition intensity from domination engine (0–1) */
  competitionIntensity: number;
  /** Market saturation from industry intelligence (0–1) */
  marketSaturation: number;
}

export interface RiskResult {
  overallRisk: number; // 0–100
  level: 'low' | 'moderate' | 'high' | 'very_high';
  factors: Record<string, number>;
}

export interface ROEInput {
  capitalRequired: number;
  predictedAnnualLift: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ROEResult {
  roe: number;
  adjustedBreakEvenMonths: number;
  monthlyLift: number;
}

export interface ScenarioInput {
  investmentAmount: number;
  /** Base predicted annual lift for the opportunity */
  baseAnnualLift: number;
  /** Original capital required */
  baseCapitalRequired: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ScenarioResult {
  projectedMonthlyLift: number;
  projectedAnnualLift: number;
  breakEvenMonths: number;
  confidence: string;
  lowBand: number;
  highBand: number;
}

// ── SPI Computation ──────────────────────────────────────────────────

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

export function computeSPI(input: SPIInput): SPIResult {
  const re = clamp(input.revenueScore);
  const gv = clamp(input.growthScore);
  const cs = clamp(input.conversionScore);
  const pp = clamp(input.pricingScore);
  const os = clamp(input.stabilityScore);
  const eq = clamp(input.executionScore);

  const spiScore = Math.round(
    re * SPI_WEIGHTS.revenueEfficiency +
    gv * SPI_WEIGHTS.growthVelocity +
    cs * SPI_WEIGHTS.conversionStrength +
    pp * SPI_WEIGHTS.pricingPower +
    os * SPI_WEIGHTS.operationalStability +
    eq * SPI_WEIGHTS.executionQuality
  );

  return {
    spiScore: clamp(spiScore),
    revenueEfficiency: re,
    growthVelocity: gv,
    conversionStrength: cs,
    pricingPower: pp,
    operationalStability: os,
    executionQuality: eq,
  };
}

// ── Risk Model ───────────────────────────────────────────────────────

export function computeRisk(input: RiskInput): RiskResult {
  const factors: Record<string, number> = {};
  let weightedSum = 0;

  for (const def of RISK_FACTORS) {
    const raw = clamp((input as unknown as Record<string, number>)[def.key] ?? 0, 0, 1);
    const score = Math.round(raw * 100);
    factors[def.key] = score;
    weightedSum += score * def.weight;
  }

  const overallRisk = Math.round(weightedSum);
  let level: RiskResult['level'];
  if (overallRisk >= 75) level = 'very_high';
  else if (overallRisk >= 50) level = 'high';
  else if (overallRisk >= 25) level = 'moderate';
  else level = 'low';

  return { overallRisk, level, factors };
}

// ── ROE Calculation ──────────────────────────────────────────────────

export function computeROE(input: ROEInput): ROEResult {
  if (input.capitalRequired <= 0) {
    return { roe: 0, adjustedBreakEvenMonths: 0, monthlyLift: 0 };
  }

  const roe = input.predictedAnnualLift / input.capitalRequired;
  const monthlyLift = input.predictedAnnualLift / 12;
  const rawBreakEven = input.capitalRequired / monthlyLift;
  const multiplier = CONFIDENCE_MULTIPLIERS[input.confidence] ?? 1.3;
  const adjustedBreakEvenMonths = Math.round(rawBreakEven * multiplier * 10) / 10;

  return {
    roe: Math.round(roe * 100) / 100,
    adjustedBreakEvenMonths,
    monthlyLift: Math.round(monthlyLift),
  };
}

// ── Investment Scenario Simulation ───────────────────────────────────

export function simulateScenario(input: ScenarioInput): ScenarioResult {
  if (input.baseCapitalRequired <= 0 || input.baseAnnualLift <= 0) {
    return {
      projectedMonthlyLift: 0,
      projectedAnnualLift: 0,
      breakEvenMonths: 0,
      confidence: input.confidence,
      lowBand: 0,
      highBand: 0,
    };
  }

  // Scale lift proportionally to investment vs base capital, with diminishing returns
  const ratio = input.investmentAmount / input.baseCapitalRequired;
  // Diminishing returns: sqrt scaling beyond 1x
  const effectiveRatio = ratio <= 1 ? ratio : 1 + Math.sqrt(ratio - 1) * 0.6;
  const projectedAnnualLift = Math.round(input.baseAnnualLift * effectiveRatio);
  const projectedMonthlyLift = Math.round(projectedAnnualLift / 12);

  const multiplier = CONFIDENCE_MULTIPLIERS[input.confidence] ?? 1.3;
  const breakEvenMonths = projectedMonthlyLift > 0
    ? Math.round((input.investmentAmount / projectedMonthlyLift) * multiplier * 10) / 10
    : 0;

  // Confidence bands
  const bandWidth = input.confidence === 'high' ? 0.15 : input.confidence === 'medium' ? 0.25 : 0.40;
  const lowBand = Math.round(projectedMonthlyLift * (1 - bandWidth));
  const highBand = Math.round(projectedMonthlyLift * (1 + bandWidth));

  return {
    projectedMonthlyLift,
    projectedAnnualLift,
    breakEvenMonths,
    confidence: input.confidence,
    lowBand,
    highBand,
  };
}

// ── Capital Priority Queue ───────────────────────────────────────────

export interface QueuedOpportunity {
  id: string;
  title: string;
  roe: number;
  capitalRequired: number;
  predictedAnnualLift: number;
  breakEvenMonths: number;
  confidence: string;
  riskLevel: string;
  opportunityType: string;
  locationId: string | null;
  city: string | null;
}

export function rankOpportunities(opportunities: QueuedOpportunity[]): QueuedOpportunity[] {
  return [...opportunities]
    .filter(o => o.roe > 0)
    .sort((a, b) => b.roe - a.roe);
}
