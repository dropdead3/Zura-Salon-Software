/**
 * Financing Engine — Pure Computation
 *
 * @deprecated — This module contains legacy financing functions that operate in dollars.
 * The canonical capital system works entirely in cents via `capital-formulas.ts`.
 *
 * Production eligibility: `calculateInternalEligibility` from `capital-formulas.ts`
 * Production cash flow: `calculateMonthlyLiftCents` / `calculateNetMonthlyGainCents` from `capital-formulas.ts`
 *
 * Retained for backward compatibility. Do not add new consumers.
 */

import { FINANCING_THRESHOLDS, REPAYMENT_DEFAULTS } from '@/config/capital-engine/financing-config';

export interface FinancingCandidate {
  roe: number;
  confidence: string;
  riskLevel: string;
  capitalRequired: number;
  status?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export interface PostFinancingCashFlow {
  monthlyLift: number;
  monthlyRepayment: number;
  netMonthlyCashFlow: number;
  totalRepayment: number;
  termMonths: number;
}

export interface RepaymentScheduleEntry {
  month: number;
  payment: number;
  remainingBalance: number;
}

/**
 * @deprecated Use `calculateInternalEligibility` from `capital-formulas.ts` instead.
 * That function uses canonical thresholds (ROE >= 1.8, confidence >= 70, etc.)
 * and operates on cents-based ZuraCapitalOpportunity records.
 */
export function isFinancingEligible(candidate: FinancingCandidate): EligibilityResult {
  const reasons: string[] = [];

  if (candidate.roe < FINANCING_THRESHOLDS.minROE) {
    reasons.push(`ROE ${candidate.roe.toFixed(1)}x below minimum ${FINANCING_THRESHOLDS.minROE}x`);
  }

  if (!(FINANCING_THRESHOLDS.allowedConfidence as readonly string[]).includes(candidate.confidence)) {
    reasons.push(`Confidence "${candidate.confidence}" not in allowed set`);
  }

  if (!(FINANCING_THRESHOLDS.allowedRisk as readonly string[]).includes(candidate.riskLevel)) {
    reasons.push(`Risk level "${candidate.riskLevel}" exceeds tolerance`);
  }

  if (candidate.capitalRequired < FINANCING_THRESHOLDS.minCapitalRequired) {
    reasons.push(`Capital $${candidate.capitalRequired.toLocaleString()} below $${FINANCING_THRESHOLDS.minCapitalRequired.toLocaleString()} minimum`);
  }

  if (candidate.status && !(FINANCING_THRESHOLDS.allowedStatuses as readonly string[]).includes(candidate.status)) {
    reasons.push(`Status "${candidate.status}" is not eligible for financing`);
  }

  return { eligible: reasons.length === 0, reasons };
}

/**
 * @deprecated Use `calculateMonthlyLiftCents` and `calculateNetMonthlyGainCents`
 * from `capital-formulas.ts` instead. Those work in cents, not dollars.
 */
export function computePostFinancingCashFlow(
  capitalRequired: number,
  predictedAnnualLift: number,
  termMonths: number = REPAYMENT_DEFAULTS.termMonths,
  annualRate: number = REPAYMENT_DEFAULTS.annualRate,
): PostFinancingCashFlow {
  const monthlyLift = predictedAnnualLift / 12;

  let monthlyRepayment: number;
  let totalRepayment: number;

  if (annualRate === 0) {
    monthlyRepayment = capitalRequired / termMonths;
    totalRepayment = capitalRequired;
  } else {
    const monthlyRate = annualRate / 12;
    monthlyRepayment =
      (capitalRequired * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    totalRepayment = monthlyRepayment * termMonths;
  }

  return {
    monthlyLift: Math.round(monthlyLift),
    monthlyRepayment: Math.round(monthlyRepayment),
    netMonthlyCashFlow: Math.round(monthlyLift - monthlyRepayment),
    totalRepayment: Math.round(totalRepayment),
    termMonths,
  };
}

/**
 * Generate a month-by-month repayment schedule.
 */
export function computeRepaymentSchedule(
  capitalRequired: number,
  termMonths: number = REPAYMENT_DEFAULTS.termMonths,
): RepaymentScheduleEntry[] {
  const monthlyPayment = Math.round((capitalRequired / termMonths) * 100) / 100;
  const schedule: RepaymentScheduleEntry[] = [];
  let remaining = capitalRequired;

  for (let m = 1; m <= termMonths; m++) {
    const payment = m === termMonths ? remaining : monthlyPayment;
    remaining = Math.max(0, remaining - payment);
    schedule.push({ month: m, payment: Math.round(payment), remainingBalance: Math.round(remaining) });
  }

  return schedule;
}

/**
 * @deprecated Use `calculateForecastStatus` from `capital-formulas.ts` instead.
 */
export function computeVariance(realizedLift: number, predictedLift: number): number | null {
  if (predictedLift === 0) return null;
  return Math.round(((realizedLift - predictedLift) / predictedLift) * 1000) / 10;
}
