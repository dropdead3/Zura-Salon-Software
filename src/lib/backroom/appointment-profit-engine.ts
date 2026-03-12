/**
 * Appointment Profit Engine — Pure calculation functions.
 * No side effects, no DB access. All inputs are pre-fetched data.
 */

import { calculateContributionMargin, type ContributionMarginResult } from './analytics-engine';

// ── Types ──────────────────────────────────────────────────────────

export type MarginHealth = 'healthy' | 'moderate' | 'low' | 'negative';

export interface AppointmentProfitInput {
  serviceRevenue: number;
  chemicalCost: number;
  laborEstimate: number;
  wasteCost: number;
}

export interface AppointmentProfitResult extends ContributionMarginResult {
  serviceRevenue: number;
  chemicalCost: number;
  laborEstimate: number;
  wasteCost: number;
  health: MarginHealth;
}

export interface LaborCostInput {
  durationMinutes: number;
  hourlyRate: number;
  hasAssistant?: boolean;
  assistantMinutes?: number;
  assistantHourlyRate?: number;
}

export interface ServiceMarginRanking {
  serviceName: string;
  appointmentCount: number;
  avgRevenue: number;
  avgChemicalCost: number;
  avgLaborCost: number;
  avgMargin: number;
  avgMarginPct: number;
  totalRevenue: number;
  totalMargin: number;
}

export interface MarginOutlier {
  appointmentId: string;
  serviceName: string;
  margin: number;
  marginPct: number;
  avgMarginPctForService: number;
  deviationPct: number;
}

export interface EnrichedAppointmentProfit {
  snapshotId: string;
  appointmentId: string | null;
  staffId: string | null;
  serviceName: string | null;
  serviceRevenue: number;
  chemicalCost: number;
  laborEstimate: number;
  wasteCost: number;
  contributionMargin: number;
  marginPct: number;
  health: MarginHealth;
  laborConfigured: boolean;
  hasMixData: boolean;
  createdAt: string;
}

// ── Calculations ───────────────────────────────────────────────────

/**
 * Determine margin health tier based on margin percentage.
 */
export function getMarginHealth(marginPct: number): MarginHealth {
  if (marginPct >= 50) return 'healthy';
  if (marginPct >= 30) return 'moderate';
  if (marginPct >= 0) return 'low';
  return 'negative';
}

/**
 * Calculate full appointment profit breakdown.
 */
export function calculateAppointmentProfit(
  input: AppointmentProfitInput
): AppointmentProfitResult {
  const margin = calculateContributionMargin({
    serviceRevenue: input.serviceRevenue,
    productCost: input.chemicalCost,
    laborEstimate: input.laborEstimate,
  });

  return {
    serviceRevenue: Math.round(input.serviceRevenue * 100) / 100,
    chemicalCost: Math.round(input.chemicalCost * 100) / 100,
    laborEstimate: Math.round(input.laborEstimate * 100) / 100,
    wasteCost: Math.round(input.wasteCost * 100) / 100,
    ...margin,
    health: getMarginHealth(margin.marginPct),
  };
}

/**
 * Estimate labor cost from service duration and hourly rates.
 * Includes optional assistant labor.
 */
export function estimateLaborCost(input: LaborCostInput): number {
  const stylistCost = (input.durationMinutes / 60) * input.hourlyRate;

  let assistantCost = 0;
  if (input.hasAssistant && input.assistantMinutes && input.assistantHourlyRate) {
    assistantCost = (input.assistantMinutes / 60) * input.assistantHourlyRate;
  }

  return Math.round((stylistCost + assistantCost) * 100) / 100;
}

/**
 * Group appointments by service name and rank by average margin.
 */
export function rankServicesByMargin(
  appointments: EnrichedAppointmentProfit[]
): ServiceMarginRanking[] {
  const groups = new Map<string, EnrichedAppointmentProfit[]>();

  for (const appt of appointments) {
    const name = appt.serviceName ?? 'Unknown';
    const list = groups.get(name) ?? [];
    list.push(appt);
    groups.set(name, list);
  }

  return Array.from(groups.entries())
    .map(([serviceName, items]) => {
      const count = items.length;
      const totalRevenue = items.reduce((s, a) => s + a.serviceRevenue, 0);
      const totalChemical = items.reduce((s, a) => s + a.chemicalCost, 0);
      const totalLabor = items.reduce((s, a) => s + a.laborEstimate, 0);
      const totalMargin = items.reduce((s, a) => s + a.contributionMargin, 0);

      const avgRevenue = totalRevenue / count;
      const avgMargin = totalMargin / count;
      const avgMarginPct = totalRevenue > 0
        ? Math.round((totalMargin / totalRevenue) * 1000) / 10
        : 0;

      return {
        serviceName,
        appointmentCount: count,
        avgRevenue: Math.round(avgRevenue * 100) / 100,
        avgChemicalCost: Math.round((totalChemical / count) * 100) / 100,
        avgLaborCost: Math.round((totalLabor / count) * 100) / 100,
        avgMargin: Math.round(avgMargin * 100) / 100,
        avgMarginPct,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalMargin: Math.round(totalMargin * 100) / 100,
      };
    })
    .sort((a, b) => b.avgMarginPct - a.avgMarginPct);
}

/**
 * Detect appointments significantly below average margin for their service type.
 * Threshold: margin% more than 15 points below the service average.
 */
export function detectMarginOutliers(
  appointments: EnrichedAppointmentProfit[],
  deviationThreshold: number = 15
): MarginOutlier[] {
  const rankings = rankServicesByMargin(appointments);
  const avgByService = new Map<string, number>();
  for (const r of rankings) {
    avgByService.set(r.serviceName, r.avgMarginPct);
  }

  return appointments
    .filter((a) => {
      const avg = avgByService.get(a.serviceName ?? 'Unknown') ?? 0;
      return a.marginPct < avg - deviationThreshold;
    })
    .map((a) => {
      const avg = avgByService.get(a.serviceName ?? 'Unknown') ?? 0;
      return {
        appointmentId: a.appointmentId ?? '',
        serviceName: a.serviceName ?? 'Unknown',
        margin: a.contributionMargin,
        marginPct: a.marginPct,
        avgMarginPctForService: avg,
        deviationPct: Math.round((avg - a.marginPct) * 10) / 10,
      };
    })
    .sort((a, b) => b.deviationPct - a.deviationPct);
}
