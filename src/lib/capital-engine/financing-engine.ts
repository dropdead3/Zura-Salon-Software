/**
 * Financing Engine — Pure Computation
 *
 * Deterministic eligibility checks, cash-flow projections,
 * repayment schedules, and variance computation.
 * No side effects, no API calls, no AI.
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
 * Deterministic eligibility check — all conditions must pass.
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
 * Compute post-financing monthly cash flow impact.
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
 * Compute variance between realized and predicted revenue lift.
 */
export function computeVariance(realizedLift: number, predictedLift: number): number | null {
  if (predictedLift === 0) return null;
  return Math.round(((realizedLift - predictedLift) / predictedLift) * 1000) / 10;
}
