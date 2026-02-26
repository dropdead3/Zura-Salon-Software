import { useQuery } from '@tanstack/react-query';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format, subDays } from 'date-fns';
import {
  fetchRevenue,
  fetchAvgTicket,
  fetchRetailRevenue,
  fetchNoShowRate,
  fetchRebookRate,
  fetchNewClientPct,
} from '@/lib/goal-metric-fetchers';

export interface BenchmarkResult {
  actual: number;
  suggestedTarget: number;
  improvementPct: number;
}

export type BenchmarkMap = Record<string, BenchmarkResult>;

const MIN_APPOINTMENTS = 30;

/** Round to nearest step */
function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Cap a percentage at a max value */
function capPct(value: number, max: number = 95): number {
  return Math.min(value, max);
}

/**
 * Fetches 90-day historical actuals for all supported metric keys
 * and computes personalized improvement targets.
 */
export function useHistoricalBenchmarks(locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const now = new Date();
  const dateFrom = format(subDays(now, 90), 'yyyy-MM-dd');
  const dateTo = format(now, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['historical-benchmarks', orgId, locationId, dateFrom],
    queryFn: async (): Promise<BenchmarkMap> => {
      const [
        revenue,
        avgTicketResult,
        retailRevenue,
        noShowResult,
        rebookResult,
        newClientResult,
      ] = await Promise.all([
        fetchRevenue(dateFrom, dateTo, locationId),
        fetchAvgTicket(dateFrom, dateTo, locationId),
        fetchRetailRevenue(dateFrom, dateTo, locationId),
        fetchNoShowRate(dateFrom, dateTo, locationId),
        fetchRebookRate(dateFrom, dateTo, locationId),
        fetchNewClientPct(dateFrom, dateTo, locationId),
      ]);

      const map: BenchmarkMap = {};

      // Monthly revenue: scale 90-day total to ~monthly, then +12%
      if (revenue > 0) {
        const monthlyActual = (revenue / 90) * 30;
        const target = roundTo(monthlyActual * 1.12, 500);
        map['monthly_revenue'] = {
          actual: Math.round(monthlyActual),
          suggestedTarget: target,
          improvementPct: ((target - monthlyActual) / monthlyActual) * 100,
        };
      }

      // Average ticket: +12%, round to nearest $5
      if (avgTicketResult.avg !== null && avgTicketResult.count >= MIN_APPOINTMENTS) {
        const actual = avgTicketResult.avg;
        const target = roundTo(actual * 1.12, 5);
        map['avg_ticket'] = {
          actual: Math.round(actual),
          suggestedTarget: target,
          improvementPct: ((target - actual) / actual) * 100,
        };
      }

      // Retail revenue: scale to monthly, +12%, round to nearest $500
      if (retailRevenue > 0) {
        const monthlyActual = (retailRevenue / 90) * 30;
        const target = roundTo(monthlyActual * 1.12, 500);
        map['retail_revenue'] = {
          actual: Math.round(monthlyActual),
          suggestedTarget: target,
          improvementPct: ((target - monthlyActual) / monthlyActual) * 100,
        };
      }

      // No-show rate: -30% (lower is better)
      if (noShowResult.rate !== null && noShowResult.totalCount >= MIN_APPOINTMENTS) {
        const actual = noShowResult.rate;
        const target = Math.round(actual * 0.7 * 10) / 10; // round to 1 decimal
        map['noshow_rate'] = {
          actual: Math.round(actual * 10) / 10,
          suggestedTarget: Math.max(target, 0.5), // floor at 0.5%
          improvementPct: actual > 0 ? ((actual - target) / actual) * 100 : 0,
        };
      }

      // Rebook rate: +10 percentage points, cap at 95%
      if (rebookResult.rate !== null && rebookResult.count >= MIN_APPOINTMENTS) {
        const actual = rebookResult.rate;
        const target = capPct(Math.round(actual + 10));
        map['rebook_rate'] = {
          actual: Math.round(actual),
          suggestedTarget: target,
          improvementPct: actual > 0 ? ((target - actual) / actual) * 100 : 0,
        };
      }

      // New client %: +10pp but cap at reasonable levels
      if (newClientResult.rate !== null && newClientResult.count >= MIN_APPOINTMENTS) {
        const actual = newClientResult.rate;
        const target = capPct(Math.round(actual + 5), 40); // new client % shouldn't be too high
        map['new_client_pct'] = {
          actual: Math.round(actual),
          suggestedTarget: target,
          improvementPct: actual > 0 ? ((target - actual) / actual) * 100 : 0,
        };
      }

      return map;
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}
