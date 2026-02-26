/**
 * Client Lifetime Value (CLV) Calculator
 * 
 * Formula: avg_ticket × annual_visit_frequency × expected_remaining_tenure
 * 
 * - avg_ticket: total_spend / visit_count
 * - annual_visit_frequency: visit_count / tenure_years (annualized)
 * - expected_remaining_tenure: industry-based estimate (3 years avg salon tenure)
 * 
 * CLV tiers:
 * - Platinum: top 5%
 * - Gold: top 20%
 * - Silver: top 50%
 * - Bronze: bottom 50%
 */

import { differenceInDays } from 'date-fns';

const AVERAGE_SALON_TENURE_YEARS = 3;
const MIN_VISITS_FOR_CLV = 2;
const MIN_TENURE_DAYS = 30;

export interface CLVResult {
  /** Projected annual value */
  annualValue: number;
  /** Total projected lifetime value */
  lifetimeValue: number;
  /** Average spend per visit */
  avgTicket: number;
  /** Annualized visit frequency */
  annualFrequency: number;
  /** Estimated remaining tenure in years */
  remainingTenure: number;
  /** Whether the CLV can be reliably computed */
  isReliable: boolean;
}

export type CLVTier = 'platinum' | 'gold' | 'silver' | 'bronze';

export interface CLVTierConfig {
  tier: CLVTier;
  label: string;
  color: string;
  bgColor: string;
}

export const CLV_TIERS: Record<CLVTier, CLVTierConfig> = {
  platinum: { tier: 'platinum', label: 'Platinum', color: 'text-violet-700 dark:text-violet-300', bgColor: 'bg-violet-100 dark:bg-violet-900/40' },
  gold: { tier: 'gold', label: 'Gold', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40' },
  silver: { tier: 'silver', label: 'Silver', color: 'text-slate-600 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800/60' },
  bronze: { tier: 'bronze', label: 'Bronze', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
};

export function calculateCLV(
  totalSpend: number | null,
  visitCount: number,
  firstVisit: string | null,
  lastVisit: string | null,
): CLVResult {
  const spend = totalSpend || 0;

  // Not enough data
  if (visitCount < MIN_VISITS_FOR_CLV || spend <= 0 || !firstVisit) {
    return {
      annualValue: 0,
      lifetimeValue: 0,
      avgTicket: visitCount > 0 ? spend / visitCount : 0,
      annualFrequency: 0,
      remainingTenure: 0,
      isReliable: false,
    };
  }

  const now = new Date();
  const firstDate = new Date(firstVisit);
  const lastDate = lastVisit ? new Date(lastVisit) : now;
  const tenureDays = Math.max(differenceInDays(lastDate, firstDate), MIN_TENURE_DAYS);
  const tenureYears = tenureDays / 365;

  const avgTicket = spend / visitCount;
  const annualFrequency = visitCount / tenureYears;
  const annualValue = avgTicket * annualFrequency;

  // Estimate remaining tenure: reduce if client has been active longer
  // Active tenure beyond 3 years reduces expected remaining
  const activeTenureYears = differenceInDays(now, firstDate) / 365;
  const remainingTenure = Math.max(AVERAGE_SALON_TENURE_YEARS - activeTenureYears, 0.5);

  const lifetimeValue = annualValue * remainingTenure;

  return {
    annualValue,
    lifetimeValue,
    avgTicket,
    annualFrequency,
    remainingTenure,
    isReliable: true,
  };
}

/**
 * Assign tier based on percentile ranking within a set of CLV values.
 */
export function assignCLVTier(
  clientClv: number,
  allClvValues: number[],
): CLVTierConfig {
  if (allClvValues.length === 0 || clientClv <= 0) return CLV_TIERS.bronze;

  const sorted = [...allClvValues].filter(v => v > 0).sort((a, b) => b - a);
  if (sorted.length === 0) return CLV_TIERS.bronze;

  const rank = sorted.findIndex(v => clientClv >= v);
  const percentile = rank === -1 ? 1 : rank / sorted.length;

  if (percentile <= 0.05) return CLV_TIERS.platinum;
  if (percentile <= 0.20) return CLV_TIERS.gold;
  if (percentile <= 0.50) return CLV_TIERS.silver;
  return CLV_TIERS.bronze;
}

/**
 * @deprecated Use useFormatCurrency().formatCurrencyCompact instead for proper locale/currency support.
 */
export function formatCLVValue(value: number): string {
  if (value >= 10000) return `$${Math.round(value / 1000)}k`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}
